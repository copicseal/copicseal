use std::sync::Mutex;
use std::time::Duration;

use serde::Serialize;
use tauri::ipc::Channel;
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_updater::{Update, UpdaterExt};
use url::Url;

/// GitHub 仓库。更新清单直接从 Release 资产里取，不再依赖自建更新域名。
const GITHUB_REPO: &str = "copicseal/copicseal";
/// Release 列表的 Atom 订阅源：走网页域名、不消耗 GitHub API 配额。
const RELEASES_ATOM: &str = "https://github.com/copicseal/copicseal/releases.atom";
/// 更新清单文件名：发布流程（scripts/generate-latest-json.mjs）产出的固定名字。
const MANIFEST_ASSET: &str = "latest.json";
/// 最多向下找这么多个版本：够用，也不会因为历史版本没有清单而一直请求。
const MAX_CANDIDATES: usize = 10;
const HTTP_TIMEOUT_SECS: u64 = 20;

/// 检查更新后暂存的更新句柄：下载安装时直接复用，避免第二次请求清单。
#[derive(Default)]
pub struct UpdateState(Mutex<Option<Update>>);

/// 返回给前端的更新信息（没有新版本时为 `null`）。
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateInfo {
    version: String,
    current_version: String,
    notes: Option<String>,
}

/// 下载进度事件，字段与 tauri-plugin-updater 的 JS 事件保持一致，
/// 前端按 `event.event === 'Started' | 'Progress' | 'Finished'` 解析。
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "event", content = "data")]
pub enum UpdateEvent {
    #[serde(rename_all = "camelCase")]
    Started {
        content_length: Option<u64>,
    },
    #[serde(rename_all = "camelCase")]
    Progress {
        chunk_length: usize,
    },
    Finished,
}

/// 检查更新。
///
/// 清单地址从 GitHub Release 列表解析（见 [`resolve_manifest_url`]）；解析失败时回落到
/// `tauri.conf.json` 里配置的 GitHub 最新版地址，避免网络异常时直接失去更新能力。
#[tauri::command]
pub async fn check_update<R: Runtime>(app: AppHandle<R>) -> Result<Option<UpdateInfo>, String> {
    let mut builder = app.updater_builder();

    match resolve_manifest_url().await {
        Ok(url) => {
            println!("检查更新：使用清单 {url}");
            builder = builder
                .endpoints(vec![url])
                .map_err(|error| format!("更新地址无效: {error}"))?;
        }
        Err(error) => println!("检查更新：解析 GitHub Release 失败，回落到默认端点（{error}）"),
    }

    let updater = builder
        .build()
        .map_err(|error| format!("初始化更新器失败: {error}"))?;
    let update = updater
        .check()
        .await
        .map_err(|error| format!("检查更新失败: {error}"))?;

    println!(
        "检查更新：{}",
        update
            .as_ref()
            .map(|update| format!("发现新版本 {}", update.version))
            .unwrap_or_else(|| "已是最新版本".to_string())
    );

    let info = update.as_ref().map(|update| UpdateInfo {
        version: update.version.clone(),
        current_version: update.current_version.clone(),
        notes: update.body.clone(),
    });

    let state = app.state::<UpdateState>();
    let mut slot = state.0.lock().map_err(|_| "更新状态不可用".to_string())?;
    *slot = update;

    Ok(info)
}

/// 下载并安装上一次检查到的更新。
///
/// Windows 上安装阶段会由安装器结束进程并重新拉起应用，不会走到函数返回；
/// macOS 上安装完成后需要用户手动重启。
#[tauri::command]
pub async fn download_and_install_update<R: Runtime>(
    app: AppHandle<R>,
    on_event: Channel<UpdateEvent>,
) -> Result<(), String> {
    // debug 构建不是 .app 包，提取路径会落到 cargo 的构建目录上：安装会把这个目录当成
    // 应用目录整个替换掉，所以开发模式下直接拒绝，安装流程只允许在打包版里验证。
    if cfg!(debug_assertions) {
        return Err("开发模式不支持安装更新，请用打包后的应用验证".to_string());
    }

    let update = {
        let state = app.state::<UpdateState>();
        let mut slot = state.0.lock().map_err(|_| "更新状态不可用".to_string())?;
        slot.take()
    }
    .ok_or_else(|| "没有待安装的更新，请先检查更新".to_string())?;

    let started = on_event.clone();
    let finished = on_event.clone();
    let mut first_chunk = true;

    update
        .download_and_install(
            move |chunk_length, content_length| {
                if first_chunk {
                    first_chunk = false;
                    let _ = started.send(UpdateEvent::Started { content_length });
                }
                let _ = started.send(UpdateEvent::Progress { chunk_length });
            },
            move || {
                let _ = finished.send(UpdateEvent::Finished);
            },
        )
        .await
        .map_err(|error| format!("下载或安装更新失败: {error}"))
}

/// 找到最新一个「真的能下载到 `latest.json`」的 Release。
///
/// Atom 订阅源按发布时间倒序列出 Release，但草稿也会出现在里面（草稿资产匿名访问是 404），
/// 所以按顺序探测清单是否可下载：第一个命中的就是最新可用的版本。这样既不消耗 GitHub API
/// 配额（API 的匿名限额按出口 IP 算，代理/共享网络很容易被打满），也不会把草稿推给用户。
async fn resolve_manifest_url() -> Result<Url, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(HTTP_TIMEOUT_SECS))
        .user_agent("Copicseal")
        .build()
        .map_err(|error| format!("初始化网络客户端失败: {error}"))?;

    let response = client
        .get(RELEASES_ATOM)
        .send()
        .await
        .map_err(|error| format!("请求 GitHub Release 列表失败: {error}"))?;

    if !response.status().is_success() {
        return Err(format!(
            "请求 GitHub Release 列表失败: HTTP {}",
            response.status()
        ));
    }

    let feed = response
        .text()
        .await
        .map_err(|error| format!("读取 GitHub Release 列表失败: {error}"))?;

    for tag in release_tags(&feed) {
        let url = manifest_url(&tag);

        match client.get(&url).send().await {
            Ok(response) if response.status().is_success() => {
                return Url::parse(&url).map_err(|error| format!("更新清单地址无效: {error}"));
            }
            Ok(response) => println!("检查更新：{tag} 没有更新清单（HTTP {}）", response.status()),
            Err(error) => println!("检查更新：{tag} 的清单请求失败（{error}）"),
        }
    }

    Err("GitHub Release 里没有可用的更新清单".to_string())
}

/// 从 Atom 订阅源里按出现顺序取出 Release 标签（去重、限量）。
fn release_tags(feed: &str) -> Vec<String> {
    const PREFIX: &str = "/releases/tag/";
    let mut tags: Vec<String> = Vec::new();
    let mut rest = feed;

    while let Some(index) = rest.find(PREFIX) {
        rest = &rest[index + PREFIX.len()..];
        let end = rest.find(['"', '<', '&']).unwrap_or(rest.len());
        let tag = &rest[..end];

        if !tag.is_empty() && !tags.iter().any(|item| item == tag) {
            tags.push(tag.to_string());
        }

        if tags.len() >= MAX_CANDIDATES {
            break;
        }
    }

    tags
}

/// 某个版本对应的更新清单地址。
fn manifest_url(tag: &str) -> String {
    format!("https://github.com/{GITHUB_REPO}/releases/download/{tag}/{MANIFEST_ASSET}")
}

#[cfg(test)]
mod tests {
    use super::*;

    const FEED: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <entry>
    <id>tag:github.com,2008:Repository/755438620/v0.4.1</id>
    <link rel="alternate" type="text/html" href="https://github.com/copicseal/copicseal/releases/tag/v0.4.1"/>
    <title>v0.4.1</title>
  </entry>
  <entry>
    <id>tag:github.com,2008:Repository/755438620/v0.4.0</id>
    <link rel="alternate" type="text/html" href="https://github.com/copicseal/copicseal/releases/tag/v0.4.0"/>
    <title>v0.4.0</title>
  </entry>
  <entry>
    <link rel="alternate" type="text/html" href="https://github.com/copicseal/copicseal/releases/tag/v0.4.0"/>
    <title>v0.4.0</title>
  </entry>
</feed>"#;

    #[test]
    fn reads_release_tags_in_feed_order() {
        assert_eq!(release_tags(FEED), vec!["v0.4.1", "v0.4.0"]);
    }

    #[test]
    fn limits_candidates() {
        let feed = (0..30)
            .map(|index| {
                format!(
                    r#"<a href="https://github.com/copicseal/copicseal/releases/tag/v0.1.{index}"/>"#
                )
            })
            .collect::<String>();

        assert_eq!(release_tags(&feed).len(), MAX_CANDIDATES);
    }

    #[test]
    fn builds_manifest_url_per_tag() {
        assert_eq!(
            manifest_url("v0.4.0"),
            "https://github.com/copicseal/copicseal/releases/download/v0.4.0/latest.json"
        );
    }
}
