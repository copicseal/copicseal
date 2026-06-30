use rusqlite::{params, Connection, OptionalExtension};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

const DATABASE_FILENAME: &str = "data.db";
pub const DATABASE_URL: &str = "sqlite:data.db";

pub fn migrations() -> Vec<Migration> {
    vec![
        Migration {
            version: 1,
            description: "create_initial_tables",
            sql: r#"
                                CREATE TABLE IF NOT EXISTS config_entries (
                                    key TEXT PRIMARY KEY,
                                    value TEXT NOT NULL,
                                    updated_at TEXT NOT NULL
                                );

                                CREATE TABLE IF NOT EXISTS comark_templates (
                                    id TEXT PRIMARY KEY,
                                    name TEXT NOT NULL,
                                    version TEXT NOT NULL,
                                    description TEXT,
                                    author TEXT,
                                    license TEXT,
                                    source_type TEXT NOT NULL,
                                    registry_url TEXT,
                                    local_path TEXT,
                                    enabled INTEGER NOT NULL,
                                    installed_at TEXT NOT NULL,
                                    updated_at TEXT NOT NULL
                                );

                                CREATE INDEX IF NOT EXISTS idx_comark_templates_source_type
                                ON comark_templates (source_type);

                                CREATE INDEX IF NOT EXISTS idx_comark_templates_enabled
                                ON comark_templates (enabled);
                        "#,
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "seed_builtin_templates",
            sql: r#"
                                INSERT OR IGNORE INTO comark_templates (
                                    id,
                                    name,
                                    version,
                                    description,
                                    author,
                                    license,
                                    source_type,
                                    registry_url,
                                    local_path,
                                    enabled,
                                    installed_at,
                                    updated_at
                                )
                                VALUES (
                                    'minimal',
                                    '极简',
                                    '1.0.0',
                                    '右下角半透明参数水印',
                                    'Copicseal',
                                    'Proprietary',
                                    'built_in',
                                    NULL,
                                    NULL,
                                    1,
                                    CAST(strftime('%s', 'now') AS TEXT),
                                    CAST(strftime('%s', 'now') AS TEXT)
                                );
                        "#,
            kind: MigrationKind::Up,
        },
    ]
}

pub fn open_database(app: &tauri::AppHandle) -> Result<Connection, String> {
    let path = database_path(app)?;
    Connection::open(path).map_err(|e| format!("打开数据库失败: {e}"))
}

pub fn get_config_value(conn: &Connection, key: &str) -> Result<Option<String>, String> {
    conn.query_row(
        "SELECT value FROM config_entries WHERE key = ?1",
        params![key],
        |row| row.get(0),
    )
    .optional()
    .map_err(|e| format!("读取配置 {key} 失败: {e}"))
}

pub fn set_config_value(conn: &Connection, key: &str, value: &str) -> Result<(), String> {
    let now = now_timestamp();
    conn.execute(
        "
        INSERT INTO config_entries (key, value, updated_at)
        VALUES (?1, ?2, ?3)
        ON CONFLICT(key) DO UPDATE SET
          value = excluded.value,
          updated_at = excluded.updated_at
        ",
        params![key, value, now],
    )
    .map_err(|e| format!("写入配置 {key} 失败: {e}"))?;

    Ok(())
}

pub fn now_timestamp() -> String {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|duration| duration.as_secs().to_string())
        .unwrap_or_else(|_| "0".to_string())
}

fn database_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| format!("无法获取应用配置目录: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("无法创建应用配置目录: {e}"))?;
    Ok(dir.join(DATABASE_FILENAME))
}
