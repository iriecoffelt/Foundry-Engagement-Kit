use std::fs;
use std::path::{Path, PathBuf};
use tauri::{path::BaseDirectory, AppHandle, Manager};

const SEED_DIR_NAME: &str = "workspace-seed";

pub fn is_dir_empty(path: &Path) -> bool {
    fs::read_dir(path)
        .map(|mut entries| entries.next().is_none())
        .unwrap_or(false)
}

/// Normalize a directory path for all platforms (local disks, UNC, network mounts).
pub fn normalize_existing_dir(path: &Path) -> Result<PathBuf, String> {
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }
    if !path.is_dir() {
        return Err(format!("Not a directory: {}", path.display()));
    }
    match path.canonicalize() {
        Ok(canonical) => Ok(canonical),
        Err(_) => Ok(path.to_path_buf()),
    }
}

pub fn validate_workspace_folder_name(name: &str) -> Result<String, String> {
    let name = name.trim();
    if name.is_empty() {
        return Err("Workspace folder name cannot be empty".into());
    }
    if name == "." || name == ".." {
        return Err("Workspace folder name is not valid".into());
    }
    #[cfg(windows)]
    {
        const INVALID: &[char] = &['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
        if name.chars().any(|c| INVALID.contains(&c)) {
            return Err("Workspace folder name contains invalid characters for Windows".into());
        }
    }
    #[cfg(not(windows))]
    {
        if name.contains('/') || name.contains('\0') {
            return Err("Workspace folder name cannot contain slashes".into());
        }
    }
    Ok(name.to_string())
}

pub fn resolve_bundled_seed(app: &AppHandle) -> Option<PathBuf> {
    if let Ok(path) = app.path().resolve(SEED_DIR_NAME, BaseDirectory::Resource) {
        if seed_is_complete(&path) {
            return Some(path);
        }
    }
    if let Ok(resource_dir) = app.path().resource_dir() {
        let path = resource_dir.join(SEED_DIR_NAME);
        if seed_is_complete(&path) {
            return Some(path);
        }
    }
    None
}

pub fn dev_workspace_seed() -> Option<PathBuf> {
    if let Ok(cwd) = std::env::current_dir() {
        let candidates = [
            cwd.join("src-tauri/resources/workspace-seed"),
            cwd.join("resources/workspace-seed"),
            cwd.clone(),
            cwd.join(".."),
            cwd.join("../.."),
        ];
        for candidate in candidates {
            if seed_is_complete(&candidate) {
                return Some(candidate);
            }
            if candidate.join("daily").is_dir() && candidate.join("reference").is_dir() {
                return Some(candidate);
            }
        }
    }
    None
}

fn seed_is_complete(seed: &Path) -> bool {
    seed.join("reference").is_dir()
        && seed.join("project/_template").is_dir()
        && seed.join("daily/standup.md").is_file()
        && seed.join("weekly/weekly-review.md").is_file()
        && seed.join("weekly/customer-sync.md").is_file()
}

pub fn resolve_seed(app: &AppHandle) -> Result<PathBuf, String> {
    resolve_bundled_seed(app)
        .or_else(dev_workspace_seed)
        .ok_or_else(|| {
            "Workspace seed files are missing from the app bundle. Reinstall the application.".into()
        })
}

pub fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
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

pub fn scaffold_workspace_from_seed(root: &Path, seed: &Path) -> Result<(), String> {
    if !seed_is_complete(seed) {
        return Err("Workspace seed is incomplete".into());
    }

    fs::create_dir_all(root.join("daily")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("weekly")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("project")).map_err(|e| e.to_string())?;
    fs::create_dir_all(root.join("reference/uploads")).map_err(|e| e.to_string())?;

    copy_dir_recursive(&seed.join("reference"), &root.join("reference"))?;

    for (subdir, file) in [
        ("daily", "standup.md"),
        ("weekly", "weekly-review.md"),
        ("weekly", "customer-sync.md"),
    ] {
        let src = seed.join(subdir).join(file);
        let dst = root.join(subdir).join(file);
        if src.is_file() && !dst.exists() {
            fs::copy(&src, &dst).map_err(|e| e.to_string())?;
        }
    }

    let template_dst = root.join("project/_template");
    if !template_dst.is_dir() {
        copy_dir_recursive(&seed.join("project/_template"), &template_dst)?;
    }

    Ok(())
}

pub fn scaffold_workspace(app: &AppHandle, root: &Path) -> Result<(), String> {
    let seed = resolve_seed(app)?;
    scaffold_workspace_from_seed(root, &seed)
}

pub fn ensure_project_template(app: &AppHandle, root: &Path) -> Result<PathBuf, String> {
    let template = root.join("project/_template");
    if template.is_dir() {
        return Ok(template);
    }

    let project_dir = root.join("project");
    if !project_dir.is_dir() {
        return Err(
            "Workspace is missing a project/ folder. Re-select your workspace root in Settings."
                .into(),
        );
    }

    let seed = resolve_seed(app)?;
    let source = seed.join("project/_template");
    if !source.is_dir() {
        return Err(format!(
            "Master template not found at {}. Reinstall the application or run workspace setup again.",
            template.display()
        ));
    }

    copy_dir_recursive(&source, &template)?;
    Ok(template)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;

    fn write_seed(seed: &Path) {
        fs::create_dir_all(seed.join("reference")).unwrap();
        fs::write(seed.join("reference/guide.md"), "# Guide").unwrap();
        fs::create_dir_all(seed.join("project/_template/00-discovery")).unwrap();
        fs::write(
            seed.join("project/_template/00-discovery/discovery.md"),
            "# Discovery",
        )
        .unwrap();
        fs::create_dir_all(seed.join("daily")).unwrap();
        fs::write(seed.join("daily/standup.md"), "# Standup").unwrap();
        fs::create_dir_all(seed.join("weekly")).unwrap();
        fs::write(seed.join("weekly/weekly-review.md"), "# Weekly").unwrap();
        fs::write(seed.join("weekly/customer-sync.md"), "# Sync").unwrap();
    }

    #[test]
    fn scaffold_creates_workspace_layout() {
        let base = env::temp_dir().join(format!(
            "fek-scaffold-test-{}",
            std::process::id()
        ));
        let seed = base.join("seed");
        let workspace = base.join("workspace");
        let _ = fs::remove_dir_all(&base);

        write_seed(&seed);
        scaffold_workspace_from_seed(&workspace, &seed).unwrap();

        assert!(workspace.join("daily/standup.md").is_file());
        assert!(workspace.join("weekly/weekly-review.md").is_file());
        assert!(workspace.join("reference/guide.md").is_file());
        assert!(workspace
            .join("project/_template/00-discovery/discovery.md")
            .is_file());

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn seed_is_complete_detects_minimal_seed() {
        let base = env::temp_dir().join(format!("fek-seed-test-{}", std::process::id()));
        let _ = fs::remove_dir_all(&base);
        write_seed(&base);
        assert!(seed_is_complete(&base));
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn validate_folder_name_rejects_slashes() {
        assert!(validate_workspace_folder_name("good-name").is_ok());
        assert!(validate_workspace_folder_name("bad/name").is_err());
    }
}
