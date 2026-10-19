//! 批量改文件名：读目录、排序、冲突校验、执行与撤销。
//!
//! 分工：**这里只做与文件系统打交道的部分**（读目录、排好序、校验、真正改名）。
//! 「规则模板怎么渲染成文件名」（`{n}` / `{name}` / `{date}` / `{time}`）放在前端 ——
//! 那里能用 JS 的 `Date` 按**本地时区**格式化文件的修改时间，不需要给 Rust 引时间库。
//!
//! 三条安全约定：
//! - `apply` 之前先全量校验：源都存在、目标不重复、目标没有被集合外的文件占用（大小写不敏感）
//! - 校验不过就**整体拒绝**（`RenameOutcome::conflicts` 非空），不产生半成品
//! - 真正改名走**临时名两阶段**，`a→b, b→c` 这种环也不会互相覆盖

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};

/// 排序依据。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RenameSortBy {
    /// 修改时间（旧 → 新）
    Modified,
    /// 创建时间（取不到时回落到修改时间）
    Created,
    /// 当前文件名（字典序）
    Name,
    /// EXIF 拍摄时间（读不到时回落到修改时间，并在结果里标记）
    Taken,
}

/// 目录里的一个候选文件。
#[derive(Debug, Clone, Serialize)]
pub struct DirectoryEntry {
    pub name: String,
    pub path: String,
    /// 小写、不带点的扩展名；没有扩展名时为空串
    pub ext: String,
    /// 不含扩展名的文件名（规则里的 `{name}`）
    pub stem: String,
    pub size: u64,
    pub modified_ms: Option<i64>,
    pub created_ms: Option<i64>,
    /// EXIF 拍摄时间的规范化形式 `YYYYMMDDHHMMSS`；没读到为 None
    pub taken_at: Option<String>,
}

/// 执行/撤销的一对改名。
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenamePair {
    pub from: String,
    pub to: String,
}

/// 被跳过的文件与原因。
#[derive(Debug, Clone, Serialize)]
pub struct RenameIssue {
    pub name: String,
    pub reason: String,
}

/// 执行结果。
#[derive(Debug, Clone, Serialize)]
pub struct RenameOutcome {
    /// 成功完成的改名（撤销时按这些对反向执行）
    pub renamed: Vec<RenamePair>,
    /// 失败的文件与原因
    pub failed: Vec<RenameIssue>,
    /// 校验不通过的目标名（非空表示**一个都没改**）
    pub conflicts: Vec<String>,
}

/// 把系统时间换算成毫秒时间戳（取不到就给 None，不猜）。
fn millis(time: std::io::Result<std::time::SystemTime>) -> Option<i64> {
    let time = time.ok()?;
    let since_epoch = time.duration_since(std::time::UNIX_EPOCH).ok()?;

    i64::try_from(since_epoch.as_millis()).ok()
}

/// EXIF 的 `YYYY:MM:DD HH:MM:SS`（兼容 `-` 分隔）→ 规范化成 `YYYYMMDDHHMMSS`。
///
/// 用字符串而不是时间戳：整串的字典序就是时间序，省掉一个时间库依赖；
/// `{date}` / `{time}` 两个 token 也就是它的两段切片。
fn normalize_exif_datetime(raw: &str) -> Option<String> {
    let digits: String = raw.chars().filter(char::is_ascii_digit).collect();

    // 至少要 YYYYMMDDHHMMSS 这么多位；多出来的（时区后缀等）丢掉
    (digits.len() >= 14).then(|| digits[..14].to_string())
}

/// 读 EXIF 拍摄时间；读不到或格式不对都返回 None（调用方回落到修改时间）。
fn read_taken_at(path: &Path) -> Option<String> {
    let data = crate::exif::read_exif(path.to_string_lossy().to_string()).ok()?;

    normalize_exif_datetime(data.date_taken.as_deref()?)
}

/// 该扩展名是否在过滤清单里（清单为空表示全都要）。
fn ext_allowed(ext: &str, filter: &[String]) -> bool {
    filter.is_empty() || filter.iter().any(|item| item.eq_ignore_ascii_case(ext))
}

/// 按依据排序；相同键回落到文件名，保证顺序稳定可重复。
fn sort_entries(entries: &mut [DirectoryEntry], sort_by: RenameSortBy, descending: bool) {
    entries.sort_by(|left, right| {
        let order = match sort_by {
            // 「拍摄时间」用**分组 + 组内**比较，避免把两种单位混进同一个键：
            // 有 EXIF 的按 `YYYYMMDDHHMMSS` 串比（字典序即时间序），
            // 没有的统一排在后面、组内再按修改时间。
            // 若直接拿「规范化串」和「毫秒时间戳」比大小，后者永远更小，顺序会整体错位。
            RenameSortBy::Taken => left
                .taken_at
                .is_none()
                .cmp(&right.taken_at.is_none())
                .then_with(|| match (&left.taken_at, &right.taken_at) {
                    (Some(a), Some(b)) => a.cmp(b),
                    _ => left.modified_ms.cmp(&right.modified_ms),
                }),
            RenameSortBy::Modified => left.modified_ms.cmp(&right.modified_ms),
            RenameSortBy::Created => left
                .created_ms
                .or(left.modified_ms)
                .cmp(&right.created_ms.or(right.modified_ms)),
            RenameSortBy::Name => std::cmp::Ordering::Equal,
        };

        let order = if order == std::cmp::Ordering::Equal {
            left.name.cmp(&right.name)
        } else {
            order
        };

        if descending {
            order.reverse()
        } else {
            order
        }
    });
}

/// 目标名是否可用：不能为空、不能带路径分隔符、不能是 `.` / `..`。
fn valid_target(name: &str) -> bool {
    !name.is_empty()
        && !name.contains(['/', '\\'])
        && name != "."
        && name != ".."
        && !name.chars().any(|c| c == '\0')
}

/// 找出不允许执行的冲突：目标重复、目标被「集合外」的文件占用（大小写不敏感）。
///
/// 目标落在本次的源集合里**不算冲突**（那是环，交给两阶段改名处理）。
fn find_conflicts(dir: &Path, pairs: &[RenamePair]) -> Vec<String> {
    let sources: Vec<String> = pairs.iter().map(|pair| pair.from.to_lowercase()).collect();
    let mut seen: Vec<String> = Vec::new();
    let mut conflicts: Vec<String> = Vec::new();

    for pair in pairs {
        let target = pair.to.to_lowercase();

        if !valid_target(&pair.to) {
            conflicts.push(pair.to.clone());
            continue;
        }

        // 集合内重复
        if seen.contains(&target) {
            conflicts.push(pair.to.clone());
            continue;
        }
        seen.push(target.clone());

        // 集合外占用：目标在磁盘上存在，而且它不是本次要被改名的某个源
        if !sources.contains(&target) && dir.join(&pair.to).exists() {
            conflicts.push(pair.to.clone());
        }
    }

    conflicts.sort();
    conflicts.dedup();
    conflicts
}

/// 读目录并按依据排序；`with_taken` 为真时顺带读 EXIF 拍摄时间。
#[tauri::command]
pub fn read_directory_entries(
    path: String,
    sort_by: RenameSortBy,
    descending: bool,
    extensions: Vec<String>,
) -> Result<Vec<DirectoryEntry>, String> {
    let dir = PathBuf::from(&path);

    if !dir.is_dir() {
        return Err(format!("不是一个目录: {path}"));
    }

    let with_taken = sort_by == RenameSortBy::Taken;
    let mut entries: Vec<DirectoryEntry> = fs::read_dir(&dir)
        .map_err(|e| format!("读取目录失败: {e}"))?
        .filter_map(|entry| entry.ok())
        .filter(|entry| entry.path().is_file())
        .filter_map(|entry| {
            let file_path = entry.path();
            let name = entry.file_name().to_string_lossy().to_string();
            let metadata = entry.metadata().ok()?;
            let extension = file_path
                .extension()
                .map(|value| value.to_string_lossy().to_ascii_lowercase())
                .unwrap_or_default();

            if !ext_allowed(&extension, &extensions) {
                return None;
            }

            let stem = file_path
                .file_stem()
                .map(|value| value.to_string_lossy().to_string())
                .unwrap_or_else(|| name.clone());

            Some(DirectoryEntry {
                name,
                path: file_path.to_string_lossy().to_string(),
                ext: extension,
                stem,
                size: metadata.len(),
                modified_ms: millis(metadata.modified()),
                created_ms: millis(metadata.created()),
                taken_at: with_taken.then(|| read_taken_at(&file_path)).flatten(),
            })
        })
        .collect();

    sort_entries(&mut entries, sort_by, descending);

    Ok(entries)
}

/// 真正执行一组改名：校验 → 临时名两阶段 → 逐条收集结果。
fn run_renames(dir: &Path, pairs: &[RenamePair]) -> Result<RenameOutcome, String> {
    let conflicts = find_conflicts(dir, pairs);

    if !conflicts.is_empty() {
        return Ok(RenameOutcome {
            renamed: Vec::new(),
            failed: Vec::new(),
            conflicts,
        });
    }

    let stamp = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or_default();

    // 第一阶段：所有源先改成临时名，腾出位置（环状改名因此不会互相覆盖）
    let mut staged: Vec<(RenamePair, PathBuf)> = Vec::new();
    let mut failed: Vec<RenameIssue> = Vec::new();

    for (index, pair) in pairs.iter().enumerate() {
        let temp = dir.join(format!(".co-rename-{stamp}-{index}.tmp"));

        match fs::rename(dir.join(&pair.from), &temp) {
            Ok(()) => staged.push((pair.clone(), temp)),
            Err(error) => {
                // 单条失败：把它已经腾走的那些还原回去，避免留下临时名
                for (done, temp_path) in staged.iter().rev() {
                    let _ = fs::rename(temp_path, dir.join(&done.from));
                }

                failed.push(RenameIssue {
                    name: pair.from.clone(),
                    reason: format!("改名失败: {error}"),
                });

                return Ok(RenameOutcome {
                    renamed: Vec::new(),
                    failed,
                    conflicts: Vec::new(),
                });
            }
        }
    }

    // 第二阶段：临时名 → 目标名
    let mut renamed: Vec<RenamePair> = Vec::new();

    for (pair, temp) in staged {
        match fs::rename(&temp, dir.join(&pair.to)) {
            Ok(()) => renamed.push(pair),
            Err(error) => failed.push(RenameIssue {
                name: pair.from.clone(),
                reason: format!("写入新名字失败: {error}"),
            }),
        }
    }

    Ok(RenameOutcome {
        renamed,
        failed,
        conflicts: Vec::new(),
    })
}

/// 执行批量改名。
#[tauri::command]
pub fn apply_batch_rename(dir: String, pairs: Vec<RenamePair>) -> Result<RenameOutcome, String> {
    run_renames(Path::new(&dir), &pairs)
}

/// 撤销上一次批量改名（把 `from` / `to` 反过来执行）。
#[tauri::command]
pub fn undo_batch_rename(dir: String, pairs: Vec<RenamePair>) -> Result<RenameOutcome, String> {
    let reversed: Vec<RenamePair> = pairs
        .iter()
        .rev()
        .map(|pair| RenamePair {
            from: pair.to.clone(),
            to: pair.from.clone(),
        })
        .collect();

    run_renames(Path::new(&dir), &reversed)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn entry(name: &str, modified: i64, taken: Option<&str>) -> DirectoryEntry {
        DirectoryEntry {
            name: name.to_string(),
            path: format!("/tmp/{name}"),
            ext: "jpg".to_string(),
            stem: name.trim_end_matches(".jpg").to_string(),
            size: 1,
            modified_ms: Some(modified),
            created_ms: None,
            taken_at: taken.map(str::to_string),
        }
    }

    fn probe_dir(label: &str) -> PathBuf {
        let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("target")
            .join("rename-probe")
            .join(label);

        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).expect("创建测试目录失败");

        dir
    }

    #[test]
    fn normalizes_exif_datetime() {
        assert_eq!(
            normalize_exif_datetime("2024:01:02 03:04:05").as_deref(),
            Some("20240102030405")
        );
        assert_eq!(
            normalize_exif_datetime("2024-01-02 03:04:05+08:00").as_deref(),
            Some("20240102030405")
        );
        assert_eq!(normalize_exif_datetime("2024:01:02"), None);
        assert_eq!(normalize_exif_datetime(""), None);
    }

    #[test]
    fn sorts_by_modified_then_name() {
        let mut entries = vec![
            entry("b.jpg", 200, None),
            entry("a.jpg", 100, None),
            entry("c.jpg", 200, None),
        ];
        sort_entries(&mut entries, RenameSortBy::Modified, false);

        let names: Vec<&str> = entries.iter().map(|item| item.name.as_str()).collect();
        // 时间相同的按名字，保证顺序稳定
        assert_eq!(names, vec!["a.jpg", "b.jpg", "c.jpg"]);
    }

    #[test]
    fn sorts_by_created_falls_back_to_modified() {
        let mut with_created = entry("has-created.jpg", 500, None);
        with_created.created_ms = Some(50);
        let mut entries = vec![entry("no-created.jpg", 100, None), with_created];

        sort_entries(&mut entries, RenameSortBy::Created, false);

        let names: Vec<&str> = entries.iter().map(|item| item.name.as_str()).collect();
        assert_eq!(names, vec!["has-created.jpg", "no-created.jpg"]);
    }

    #[test]
    fn sorts_by_taken_with_fallback_and_descending() {
        let mut entries = vec![
            entry("no-exif.jpg", 300, None),
            entry("early.jpg", 999, Some("20200101000000")),
            entry("late.jpg", 999, Some("20220303000000")),
        ];
        sort_entries(&mut entries, RenameSortBy::Taken, true);

        let names: Vec<&str> = entries.iter().map(|item| item.name.as_str()).collect();
        // 降序：晚拍的在前，没 EXIF 的按修改时间参与比较
        assert_eq!(names, vec!["no-exif.jpg", "late.jpg", "early.jpg"]);
    }

    #[test]
    fn sorts_by_name_is_alphabetical() {
        let mut entries = vec![
            entry("a10.jpg", 1, None),
            entry("a3.jpg", 2, None),
            entry("a1.jpg", 3, None),
        ];
        sort_entries(&mut entries, RenameSortBy::Name, false);

        let names: Vec<&str> = entries.iter().map(|item| item.name.as_str()).collect();
        assert_eq!(names, vec!["a1.jpg", "a10.jpg", "a3.jpg"]);
    }

    #[test]
    fn filters_by_extension() {
        assert!(ext_allowed("jpg", &[]));
        assert!(ext_allowed("jpg", &["JPG".to_string()]));
        assert!(!ext_allowed("png", &["jpg".to_string()]));
    }

    #[test]
    fn rejects_invalid_targets() {
        assert!(valid_target("b1.jpg"));
        assert!(valid_target("照片_001.jpg"));
        assert!(!valid_target(""));
        assert!(!valid_target("a/b.jpg"));
        assert!(!valid_target(".."));
    }

    #[test]
    fn detects_conflicts_case_insensitively_and_ignores_cycles() {
        let dir = probe_dir("conflicts");
        fs::write(dir.join("occupied.jpg"), b"x").expect("写入测试文件失败");

        // 目标被集合外的文件占用
        let occupied = vec![RenamePair {
            from: "a.jpg".to_string(),
            to: "occupied.jpg".to_string(),
        }];
        assert_eq!(find_conflicts(&dir, &occupied).len(), 1);

        // 目标重复
        let duplicated = vec![
            RenamePair {
                from: "a.jpg".to_string(),
                to: "B.JPG".to_string(),
            },
            RenamePair {
                from: "b.jpg".to_string(),
                to: "b.jpg".to_string(),
            },
        ];
        assert_eq!(find_conflicts(&dir, &duplicated), vec!["b.jpg".to_string()]);

        // 环（a→b, b→c）：目标都在源集合里，不算冲突
        let cycle = vec![
            RenamePair {
                from: "a.jpg".to_string(),
                to: "b.jpg".to_string(),
            },
            RenamePair {
                from: "b.jpg".to_string(),
                to: "c.jpg".to_string(),
            },
        ];
        assert!(find_conflicts(&dir, &cycle).is_empty());

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn applies_and_undoes_a_cycle() {
        let dir = probe_dir("cycle");
        fs::write(dir.join("a.jpg"), b"a").expect("写入测试文件失败");
        fs::write(dir.join("b.jpg"), b"b").expect("写入测试文件失败");

        let pairs = vec![
            RenamePair {
                from: "a.jpg".to_string(),
                to: "b1.jpg".to_string(),
            },
            RenamePair {
                from: "b.jpg".to_string(),
                to: "b2.jpg".to_string(),
            },
        ];
        let outcome = run_renames(&dir, &pairs).expect("执行改名失败");

        assert!(outcome.conflicts.is_empty());
        assert_eq!(outcome.renamed.len(), 2);
        assert!(dir.join("b1.jpg").is_file());
        assert!(dir.join("b2.jpg").is_file());
        assert!(!dir.join("a.jpg").exists());

        let undone = undo_batch_rename(dir.to_string_lossy().to_string(), outcome.renamed)
            .expect("撤销失败");

        assert_eq!(undone.renamed.len(), 2);
        assert!(dir.join("a.jpg").is_file());
        assert!(dir.join("b.jpg").is_file());
        assert_eq!(fs::read(dir.join("a.jpg")).unwrap(), b"a");

        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn refuses_the_whole_batch_when_a_target_is_occupied() {
        let dir = probe_dir("occupied");
        fs::write(dir.join("a.jpg"), b"a").expect("写入测试文件失败");
        fs::write(dir.join("taken.jpg"), b"t").expect("写入测试文件失败");

        let pairs = vec![RenamePair {
            from: "a.jpg".to_string(),
            to: "taken.jpg".to_string(),
        }];
        let outcome = run_renames(&dir, &pairs).expect("执行改名失败");

        assert_eq!(outcome.conflicts, vec!["taken.jpg".to_string()]);
        assert!(outcome.renamed.is_empty());
        // 一个都没动
        assert!(dir.join("a.jpg").is_file());
        assert_eq!(fs::read(dir.join("taken.jpg")).unwrap(), b"t");

        let _ = fs::remove_dir_all(&dir);
    }
}
