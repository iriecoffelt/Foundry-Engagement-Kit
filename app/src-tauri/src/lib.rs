use chrono::Local;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Component, Path, PathBuf};
use tauri::{AppHandle, Manager};
use walkdir::WalkDir;

mod report_export;
mod workspace_backup;
mod workspace_search;

const CONFIG_FILE: &str = "workspace.json";

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub children: Option<Vec<FileEntry>>,
}

#[derive(Debug, Serialize, Deserialize)]
struct WorkspaceConfig {
    workspace_root: String,
}

fn config_path(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_config_dir()
        .map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join(CONFIG_FILE))
}

fn load_config(app: &AppHandle) -> Option<String> {
    let path = config_path(app).ok()?;
    let data = fs::read_to_string(path).ok()?;
    serde_json::from_str::<WorkspaceConfig>(&data)
        .ok()
        .map(|c| c.workspace_root)
}

fn save_config(app: &AppHandle, root: &str) -> Result<(), String> {
    let path = config_path(app)?;
    let config = WorkspaceConfig {
        workspace_root: root.to_string(),
    };
    fs::write(path, serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())
}

fn is_valid_workspace(path: &Path) -> bool {
    path.join("daily").is_dir()
        && path.join("weekly").is_dir()
        && path.join("project").is_dir()
        && path.join("reference").is_dir()
}

fn default_workspace_root() -> Option<PathBuf> {
    if let Ok(cwd) = std::env::current_dir() {
        let candidates = [cwd.clone(), cwd.join(".."), cwd.join("../..")];
        for candidate in candidates {
            let canonical = candidate.canonicalize().unwrap_or(candidate);
            if is_valid_workspace(&canonical) {
                return Some(canonical);
            }
        }
    }
    None
}

fn resolve_workspace(app: &AppHandle) -> Result<PathBuf, String> {
    if let Some(saved) = load_config(app) {
        let path = PathBuf::from(&saved);
        if is_valid_workspace(&path) {
            return Ok(path);
        }
    }
    if let Some(default) = default_workspace_root() {
        save_config(app, default.to_string_lossy().as_ref())?;
        return Ok(default);
    }
    Err("No workspace configured. Please select your template workspace folder.".into())
}

fn validate_relative_path(relative: &str) -> Result<(), String> {
    let path = Path::new(relative);
    for component in path.components() {
        match component {
            Component::ParentDir | Component::RootDir | Component::Prefix(_) => {
                return Err("Invalid path".into());
            }
            _ => {}
        }
    }
    Ok(())
}

fn resolve_path(app: &AppHandle, relative: &str) -> Result<PathBuf, String> {
    validate_relative_path(relative)?;
    let root = resolve_workspace(app)?;
    let full = root.join(relative);
    let canonical = full
        .canonicalize()
        .map_err(|e| format!("Path not found: {e}"))?;
    let root_canonical = root.canonicalize().map_err(|e| e.to_string())?;
    if !canonical.starts_with(&root_canonical) {
        return Err("Access denied: path outside workspace".into());
    }
    Ok(canonical)
}

fn list_dir_entries(dir: &Path, relative: &str, recursive: bool) -> Result<Vec<FileEntry>, String> {
    let mut entries: Vec<FileEntry> = fs::read_dir(dir)
        .map_err(|e| e.to_string())?
        .filter_map(|e| e.ok())
        .map(|entry| {
            let name = entry.file_name().to_string_lossy().to_string();
            let rel = if relative.is_empty() {
                name.clone()
            } else {
                format!("{relative}/{name}")
            };
            let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
            FileEntry {
                name,
                path: rel,
                is_dir,
                children: None,
            }
        })
        .filter(|e| e.name != ".git" && !e.name.starts_with('.') && e.name != "engagement.json")
        .collect();

    entries.sort_by(|a, b| b.is_dir.cmp(&a.is_dir).then(a.name.to_lowercase().cmp(&b.name.to_lowercase())));

    if recursive {
        for entry in entries.iter_mut().filter(|e| e.is_dir) {
            let child_path = dir.join(&entry.name);
            entry.children = Some(list_dir_entries(&child_path, &entry.path, true)?);
        }
    }

    Ok(entries)
}

#[tauri::command]
fn get_workspace_root(app: AppHandle) -> Result<String, String> {
    Ok(resolve_workspace(&app)?.to_string_lossy().to_string())
}

#[tauri::command]
fn set_workspace_root(app: AppHandle, path: String) -> Result<(), String> {
    let path_buf = PathBuf::from(&path);
    let canonical = path_buf
        .canonicalize()
        .map_err(|_| "Folder does not exist".to_string())?;
    if !is_valid_workspace(&canonical) {
        return Err(
            "Invalid workspace: folder must contain daily/, weekly/, project/, and reference/"
                .into(),
        );
    }
    save_config(&app, canonical.to_string_lossy().as_ref())
}

#[tauri::command]
fn list_directory(app: AppHandle, relative: String, recursive: bool) -> Result<Vec<FileEntry>, String> {
    let full = resolve_path(&app, &relative)?;
    if !full.is_dir() {
        return Err("Not a directory".into());
    }
    list_dir_entries(&full, &relative, recursive)
}

fn read_file_internal(app: &AppHandle, relative: &str) -> Result<String, String> {
    let full = resolve_path(app, relative)?;
    if full.is_dir() {
        return Err("Cannot open a folder — select a file instead.".into());
    }
    fs::read_to_string(full).map_err(|e| e.to_string())
}

fn write_file_internal(app: &AppHandle, relative: &str, content: &str) -> Result<(), String> {
    let root = resolve_workspace(app)?;
    validate_relative_path(relative)?;
    let full = root.join(relative);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let canonical_parent = full
        .parent()
        .and_then(|p| p.canonicalize().ok())
        .unwrap_or_else(|| root.clone());
    let root_canonical = root.canonicalize().map_err(|e| e.to_string())?;
    if !canonical_parent.starts_with(&root_canonical) {
        return Err("Access denied".into());
    }
    fs::write(full, content).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_file(app: AppHandle, relative: String) -> Result<String, String> {
    read_file_internal(&app, &relative)
}

#[tauri::command]
fn write_file(app: AppHandle, relative: String, content: String) -> Result<(), String> {
    write_file_internal(&app, &relative, &content)
}

#[tauri::command]
fn delete_path(app: AppHandle, relative: String) -> Result<(), String> {
    if relative.starts_with("project/_template") {
        return Err("Cannot delete the master template".into());
    }
    let full = resolve_path(&app, &relative)?;
    if full.is_dir() {
        fs::remove_dir_all(full).map_err(|e| e.to_string())
    } else {
        fs::remove_file(full).map_err(|e| e.to_string())
    }
}

#[tauri::command]
fn create_directory(app: AppHandle, relative: String) -> Result<(), String> {
    let root = resolve_workspace(&app)?;
    validate_relative_path(&relative)?;
    let full = root.join(&relative);
    fs::create_dir_all(full).map_err(|e| e.to_string())
}

#[tauri::command]
fn create_file(app: AppHandle, relative: String, content: String) -> Result<(), String> {
    write_file_internal(&app, &relative, &content)
}

#[tauri::command]
fn list_projects(app: AppHandle) -> Result<Vec<FileEntry>, String> {
    let entries = list_directory(app, "project".to_string(), false)?;
    Ok(entries
        .into_iter()
        .filter(|e| e.is_dir && e.name != "_template")
        .collect())
}

#[tauri::command]
fn create_project(app: AppHandle, name: String) -> Result<String, String> {
    let sanitized = name
        .trim()
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();

    if sanitized.is_empty() {
        return Err("Invalid project name".into());
    }

    let relative = format!("project/{sanitized}");
    let root = resolve_workspace(&app)?;
    let dest = root.join(&relative);
    if dest.exists() {
        return Err("Project already exists".into());
    }

    let template = root.join("project/_template");
    if !template.is_dir() {
        return Err("Master template not found at project/_template".into());
    }

    copy_dir_recursive(&template, &dest)?;
    Ok(relative)
}

#[tauri::command]
fn clone_project(app: AppHandle, source_path: String, new_name: String) -> Result<String, String> {
    let sanitized = new_name
        .trim()
        .to_lowercase()
        .replace(' ', "-")
        .chars()
        .filter(|c| c.is_alphanumeric() || *c == '-' || *c == '_')
        .collect::<String>();

    if sanitized.is_empty() {
        return Err("Invalid project name".into());
    }

    validate_relative_path(&source_path)?;
    let root = resolve_workspace(&app)?;
    let src = root.join(&source_path);
    if !src.is_dir() {
        return Err("Source project not found".into());
    }

    let relative = format!("project/{sanitized}");
    let dest = root.join(&relative);
    if dest.exists() {
        return Err("A project with that name already exists".into());
    }

    copy_dir_recursive(&src, &dest)?;

    let engagement_path = format!("{relative}/engagement.json");
    if resolve_path(&app, &engagement_path).is_ok() {
        let content = read_file_internal(&app, &engagement_path)?;
        if let Ok(mut json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(obj) = json.as_object_mut() {
                obj.insert(
                    "displayName".to_string(),
                    serde_json::Value::String(new_name.trim().to_string()),
                );
                obj.insert(
                    "clonedFrom".to_string(),
                    serde_json::Value::String(source_path.clone()),
                );
                obj.insert(
                    "updatedAt".to_string(),
                    serde_json::Value::String(chrono::Local::now().to_rfc3339()),
                );
            }
            write_file_internal(&app, &engagement_path, &serde_json::to_string_pretty(&json).unwrap())?;
        }
    }

    Ok(relative)
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
    fs::create_dir_all(dst).map_err(|e| e.to_string())?;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let file_type = entry.file_type().map_err(|e| e.to_string())?;
        let target = dst.join(entry.file_name());
        if file_type.is_dir() {
            copy_dir_recursive(&entry.path(), &target)?;
        } else {
            fs::copy(entry.path(), target).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}

#[tauri::command]
fn create_dated_entry(
    app: AppHandle,
    category: String,
    template_name: String,
) -> Result<String, String> {
    let date = Local::now().format("%Y-%m-%d").to_string();
    let base = match category.as_str() {
        "daily" => "daily",
        "weekly" => "weekly",
        _ => return Err("Invalid category".into()),
    };

    let template_path = format!("{base}/{template_name}.md");
    let template_content = read_file_internal(&app, &template_path)?;
    let new_path = format!("{base}/{template_name}-{date}.md");

    if resolve_path(&app, &new_path).is_ok() {
        return Err(format!("Entry already exists for {date}"));
    }

    let content = template_content
        .replace("{{DATE}}", &date)
        .replace("{{ENGAGEMENT_NAME}}", "")
        .replace("{{MILESTONE}}", "")
        .replace("{{MEETING_NAME}}", "")
        .replace("{{ATTENDEES}}", "")
        .replace("{{DURATION}}", "30 min")
        .replace("{{MEETING}}", "");

    write_file_internal(&app, &new_path, &content)?;
    Ok(new_path)
}

#[tauri::command]
fn search_files(app: AppHandle, query: String) -> Result<Vec<FileEntry>, String> {
    let root = resolve_workspace(&app)?;
    let query_lower = query.to_lowercase();
    let mut results = Vec::new();

    for entry in WalkDir::new(&root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        let rel = path
            .strip_prefix(&root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        if rel.contains(".git") {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        if name.to_lowercase().contains(&query_lower) || rel.to_lowercase().contains(&query_lower) {
            results.push(FileEntry {
                name,
                path: rel,
                is_dir: false,
                children: None,
            });
        }
    }

    results.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(results)
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ProjectMeta {
    pub slug: String,
    pub path: String,
    pub display_name: String,
    pub customer: String,
    pub status: String,
    pub target_go_live: String,
}

#[tauri::command]
fn import_file(app: AppHandle, source_path: String, dest_relative: String) -> Result<String, String> {
    let source = PathBuf::from(&source_path);
    if !source.is_file() {
        return Err("Selected path is not a file".into());
    }
    let file_name = source
        .file_name()
        .ok_or("Invalid source file name")?
        .to_string_lossy()
        .to_string();

    let dest = if dest_relative.ends_with('/') {
        format!("{dest_relative}{file_name}")
    } else if dest_relative.is_empty() {
        file_name
    } else {
        dest_relative
    };

    validate_relative_path(&dest)?;
    let root = resolve_workspace(&app)?;
    let full_dest = root.join(&dest);
    if let Some(parent) = full_dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let root_canonical = root.canonicalize().map_err(|e| e.to_string())?;
    let parent_canonical = full_dest
        .parent()
        .and_then(|p| p.canonicalize().ok())
        .ok_or("Invalid destination")?;
    if !parent_canonical.starts_with(&root_canonical) {
        return Err("Access denied".into());
    }
    fs::copy(&source, &full_dest).map_err(|e| e.to_string())?;
    Ok(dest)
}

#[tauri::command]
fn read_json(app: AppHandle, relative: String) -> Result<serde_json::Value, String> {
    let content = read_file_internal(&app, &relative)?;
    serde_json::from_str(&content).map_err(|e| format!("Invalid JSON: {e}"))
}

#[tauri::command]
fn write_json(app: AppHandle, relative: String, data: serde_json::Value) -> Result<(), String> {
    let content = serde_json::to_string_pretty(&data).map_err(|e| e.to_string())?;
    write_file_internal(&app, &relative, &content)
}

#[tauri::command]
fn list_projects_with_meta(app: AppHandle) -> Result<Vec<ProjectMeta>, String> {
    let projects = list_projects(app.clone())?;
    let mut result = Vec::new();

    for project in projects {
        let meta_path = format!("{}/engagement.json", project.path);
        let meta = if resolve_path(&app, &meta_path).is_ok() {
            let content = read_file_internal(&app, &meta_path)?;
            serde_json::from_str::<serde_json::Value>(&content).ok()
        } else {
            None
        };

        let display_name = meta
            .as_ref()
            .and_then(|m| m.get("displayName"))
            .and_then(|v| v.as_str())
            .unwrap_or(&project.name)
            .to_string();
        let customer = meta
            .as_ref()
            .and_then(|m| m.get("customer"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();
        let status = meta
            .as_ref()
            .and_then(|m| m.get("status"))
            .and_then(|v| v.as_str())
            .unwrap_or("discovery")
            .to_string();
        let target_go_live = meta
            .as_ref()
            .and_then(|m| m.get("targetGoLive"))
            .and_then(|v| v.as_str())
            .unwrap_or("")
            .to_string();

        result.push(ProjectMeta {
            slug: project.name.clone(),
            path: project.path.clone(),
            display_name,
            customer,
            status,
            target_go_live,
        });
    }

    result.sort_by(|a, b| a.display_name.to_lowercase().cmp(&b.display_name.to_lowercase()));
    Ok(result)
}

#[tauri::command]
fn resolve_absolute_path(app: AppHandle, relative: String) -> Result<String, String> {
    Ok(resolve_path(&app, &relative)?.to_string_lossy().to_string())
}

#[tauri::command]
fn open_path_with_system(app: AppHandle, relative: String) -> Result<(), String> {
    let absolute = resolve_path(&app, &relative)?;
    open::that(absolute).map_err(|e| e.to_string())
}

#[tauri::command]
fn open_url(url: String) -> Result<(), String> {
    let trimmed = url.trim();
    let allowed = trimmed.starts_with("http://")
        || trimmed.starts_with("https://")
        || trimmed.starts_with("x-apple.systempreferences:");
    if !allowed {
        return Err("URL scheme not allowed".into());
    }
    open::that(trimmed).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_project_report(
    app: AppHandle,
    project_path: String,
    format: String,
    dest_path: String,
) -> Result<(), String> {
    let root = resolve_workspace(&app)?;
    let dest = PathBuf::from(&dest_path);
    if dest.parent().is_none() {
        return Err("Invalid destination path".into());
    }
    report_export::export_report(&root, &project_path, &format, &dest)
}

#[tauri::command]
fn setup_engagement_project(
    app: AppHandle,
    slug: String,
    engagement_json: serde_json::Value,
    readme: String,
    discovery: String,
    scoping: String,
) -> Result<String, String> {
    let relative = create_project(app.clone(), slug)?;
    write_json(
        app.clone(),
        format!("{relative}/engagement.json"),
        engagement_json,
    )?;
    write_file_internal(&app, &format!("{relative}/README.md"), &readme)?;
    write_file_internal(&app, &format!("{relative}/00-discovery/discovery.md"), &discovery)?;
    write_file_internal(&app, &format!("{relative}/01-scoping/scoping.md"), &scoping)?;
    create_directory(app, format!("{relative}/references"))?;
    Ok(relative)
}

#[tauri::command]
fn write_bytes_absolute(dest_path: String, bytes: Vec<u8>) -> Result<(), String> {
    let dest = PathBuf::from(&dest_path);
    if dest.parent().is_none() {
        return Err("Invalid destination path".into());
    }
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(dest, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_binary(app: AppHandle, relative: String, bytes: Vec<u8>) -> Result<(), String> {
    let root = resolve_workspace(&app)?;
    validate_relative_path(&relative)?;
    let full = root.join(&relative);
    if let Some(parent) = full.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let root_canonical = root.canonicalize().map_err(|e| e.to_string())?;
    let parent_canonical = full
        .parent()
        .and_then(|p| p.canonicalize().ok())
        .unwrap_or_else(|| root.clone());
    if !parent_canonical.starts_with(&root_canonical) {
        return Err("Access denied".into());
    }
    fs::write(full, bytes).map_err(|e| e.to_string())
}

#[tauri::command]
fn export_workspace_archive(app: AppHandle, dest_path: String) -> Result<(), String> {
    let root = resolve_workspace(&app)?;
    let dest = workspace_backup::resolve_backup_dest(&dest_path);
    workspace_backup::export_workspace(&root, &dest)
}

#[tauri::command]
fn import_workspace_archive(app: AppHandle, source_path: String) -> Result<(), String> {
    let root = resolve_workspace(&app)?;
    let source = PathBuf::from(&source_path);
    workspace_backup::import_workspace(&root, &source)
}

#[tauri::command]
fn search_workspace(
    app: AppHandle,
    query: String,
    project_filter: Option<String>,
    category_filter: Option<String>,
) -> Result<Vec<workspace_search::SearchHit>, String> {
    let root = resolve_workspace(&app)?;
    let pf = project_filter.filter(|s| !s.is_empty() && s != "all");
    let cf = category_filter.filter(|s| !s.is_empty() && s != "all");
    workspace_search::search_workspace(
        &root,
        &query,
        pf.as_deref(),
        cf.as_deref(),
    )
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            get_workspace_root,
            set_workspace_root,
            list_directory,
            read_file,
            write_file,
            delete_path,
            create_directory,
            create_file,
            list_projects,
            create_project,
            create_dated_entry,
            search_files,
            import_file,
            read_json,
            write_json,
            list_projects_with_meta,
            resolve_absolute_path,
            open_path_with_system,
            open_url,
            export_project_report,
            write_bytes_absolute,
            write_binary,
            setup_engagement_project,
            clone_project,
            export_workspace_archive,
            import_workspace_archive,
            search_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
