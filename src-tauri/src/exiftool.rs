use tauri::AppHandle;

/// 组件 id：与静态仓库里的目录名、内置 catalog 一致。
///
/// 放在这里而不是插件层：**哪个组件归哪个功能用**是功能域自己的事，
/// 插件层只提供通用的「装组件 / 解析怎么跑」能力，不认识任何具体组件。
const EXIFTOOL_COMPONENT: &str = "exiftool";

/// 错误码：系统里没有、插件目录里也没装 ExifTool。
///
/// 前端据此给出「去设置 → 插件安装」的入口（与 `shutter-count/provider.ts` 里那份一致）。
pub(crate) const EXIFTOOL_MISSING_CODE: &str = "exiftool-missing";

/// 用 ExifTool 读一个文件的元数据，返回原始 stdout（调用方自己解析 JSON）。
///
/// 只读、不改文件；`args` 由调用方给（例如 `-json -n -ShutterCount`）。
/// 「用哪一份 exiftool」交给插件层统一解析：装了插件里的就用它，否则回落到系统自带的
/// （见 `plugin::component_command`）。
#[tauri::command]
pub async fn read_exiftool_metadata(
    app: AppHandle,
    path: String,
    args: Vec<String>,
) -> Result<String, String> {
    let (program, prefix) = crate::plugin::component_command(&app, EXIFTOOL_COMPONENT)?
        .ok_or_else(|| {
            format!(
                "[[co:{EXIFTOOL_MISSING_CODE}]]没有可用的 ExifTool：系统里没找到，插件目录里也没装"
            )
        })?;

    tauri::async_runtime::spawn_blocking(move || {
        let mut command = std::process::Command::new(&program);
        command.args(&prefix).args(&args).arg(&path);

        // Windows 上不要让子进程弹控制台窗口
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x0800_0000;
            command.creation_flags(CREATE_NO_WINDOW);
        }

        let output = command
            .output()
            .map_err(|e| format!("启动 ExifTool 失败: {e}"))?;

        if !output.status.success() {
            let stderr = String::from_utf8_lossy(&output.stderr);
            return Err(format!("ExifTool 读取失败: {}", stderr.trim()));
        }

        String::from_utf8(output.stdout).map_err(|e| format!("ExifTool 输出不是有效文本: {e}"))
    })
    .await
    .map_err(|e| format!("ExifTool 任务失败: {e}"))?
}
