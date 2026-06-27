use crate::db;
use rusqlite::{params, OptionalExtension};
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ComarkTemplateRecord {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub license: Option<String>,
    pub source_type: String,
    pub registry_url: Option<String>,
    pub local_path: Option<String>,
    pub enabled: bool,
    pub installed_at: String,
    pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UpsertComarkTemplatePayload {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: Option<String>,
    pub author: Option<String>,
    pub license: Option<String>,
    pub source_type: String,
    pub registry_url: Option<String>,
    pub local_path: Option<String>,
    pub enabled: bool,
}

#[tauri::command]
pub fn list_comark_templates(app: tauri::AppHandle) -> Result<Vec<ComarkTemplateRecord>, String> {
    let conn = db::open_database(&app)?;
    let mut stmt = conn
        .prepare(
            "
            SELECT
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
            FROM comark_templates
            ORDER BY source_type ASC, name COLLATE NOCASE ASC
            ",
        )
        .map_err(|e| format!("查询模板列表失败: {e}"))?;

    let rows = stmt
        .query_map([], |row| {
            Ok(ComarkTemplateRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                version: row.get(2)?,
                description: row.get(3)?,
                author: row.get(4)?,
                license: row.get(5)?,
                source_type: row.get(6)?,
                registry_url: row.get(7)?,
                local_path: row.get(8)?,
                enabled: row.get::<_, i64>(9)? != 0,
                installed_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        })
        .map_err(|e| format!("读取模板列表失败: {e}"))?;

    rows.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("解析模板列表失败: {e}"))
}

#[tauri::command]
pub fn upsert_comark_template(
    app: tauri::AppHandle,
    payload: UpsertComarkTemplatePayload,
) -> Result<ComarkTemplateRecord, String> {
    validate_source_type(&payload.source_type)?;

    let conn = db::open_database(&app)?;
    let now = db::now_timestamp();
    let installed_at = conn
        .query_row(
            "SELECT installed_at FROM comark_templates WHERE id = ?1",
            params![payload.id],
            |row| row.get::<_, String>(0),
        )
        .optional()
        .map_err(|e| format!("读取模板安装时间失败: {e}"))?
        .unwrap_or_else(|| now.clone());

    conn.execute(
        "
        INSERT INTO comark_templates (
          id, name, version, description, author, license, source_type,
          registry_url, local_path, enabled, installed_at, updated_at
        )
        VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)
        ON CONFLICT(id) DO UPDATE SET
          name = excluded.name,
          version = excluded.version,
          description = excluded.description,
          author = excluded.author,
          license = excluded.license,
          source_type = excluded.source_type,
          registry_url = excluded.registry_url,
          local_path = excluded.local_path,
          enabled = excluded.enabled,
          updated_at = excluded.updated_at
        ",
        params![
            payload.id,
            payload.name,
            payload.version,
            payload.description,
            payload.author,
            payload.license,
            payload.source_type,
            payload.registry_url,
            payload.local_path,
            if payload.enabled { 1 } else { 0 },
            installed_at,
            now,
        ],
    )
    .map_err(|e| format!("保存模板失败: {e}"))?;

    get_template_by_id(&conn, &payload.id)?.ok_or_else(|| "模板写入后未能读取结果".to_string())
}

#[tauri::command]
pub fn remove_comark_template(app: tauri::AppHandle, id: String) -> Result<(), String> {
    let conn = db::open_database(&app)?;
    let record = get_template_by_id(&conn, &id)?.ok_or_else(|| "模板不存在".to_string())?;

    if record.source_type == "built_in" {
        return Err("内置模板不支持删除".to_string());
    }

    conn.execute("DELETE FROM comark_templates WHERE id = ?1", params![id])
        .map_err(|e| format!("删除模板记录失败: {e}"))?;

    if record.enabled {
        ensure_at_least_one_enabled(&conn)?;
    }

    if let Some(local_path) = record.local_path {
        let path = std::path::PathBuf::from(&local_path);
        if path.exists() {
            std::fs::remove_file(&path).map_err(|e| format!("删除模板文件失败: {e}"))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn set_comark_template_enabled(
    app: tauri::AppHandle,
    id: String,
    enabled: bool,
) -> Result<(), String> {
    let conn = db::open_database(&app)?;
    let record = get_template_by_id(&conn, &id)?.ok_or_else(|| "模板不存在".to_string())?;

    if record.enabled == enabled {
        return Ok(());
    }

    if !enabled {
        let enabled_count: i64 = conn
            .query_row(
                "SELECT COUNT(1) FROM comark_templates WHERE enabled = 1",
                [],
                |row| row.get(0),
            )
            .map_err(|e| format!("统计启用模板数量失败: {e}"))?;
        if enabled_count <= 1 {
            return Err("至少保留一个启用模板".to_string());
        }
    }

    conn.execute(
        "UPDATE comark_templates SET enabled = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, if enabled { 1 } else { 0 }, db::now_timestamp()],
    )
    .map_err(|e| format!("更新模板启用状态失败: {e}"))?;

    Ok(())
}

fn validate_source_type(source_type: &str) -> Result<(), String> {
    match source_type {
        "built_in" | "remote" => Ok(()),
        _ => Err("模板来源类型无效".to_string()),
    }
}

fn ensure_at_least_one_enabled(conn: &rusqlite::Connection) -> Result<(), String> {
    let enabled_count: i64 = conn
        .query_row(
            "SELECT COUNT(1) FROM comark_templates WHERE enabled = 1",
            [],
            |row| row.get(0),
        )
        .map_err(|e| format!("统计启用模板数量失败: {e}"))?;

    if enabled_count == 0 {
        return Err("至少保留一个启用模板".to_string());
    }

    Ok(())
}

fn get_template_by_id(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<Option<ComarkTemplateRecord>, String> {
    conn.query_row(
        "
        SELECT
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
        FROM comark_templates
        WHERE id = ?1
        ",
        params![id],
        |row| {
            Ok(ComarkTemplateRecord {
                id: row.get(0)?,
                name: row.get(1)?,
                version: row.get(2)?,
                description: row.get(3)?,
                author: row.get(4)?,
                license: row.get(5)?,
                source_type: row.get(6)?,
                registry_url: row.get(7)?,
                local_path: row.get(8)?,
                enabled: row.get::<_, i64>(9)? != 0,
                installed_at: row.get(10)?,
                updated_at: row.get(11)?,
            })
        },
    )
    .optional()
    .map_err(|e| format!("读取模板失败: {e}"))
}
