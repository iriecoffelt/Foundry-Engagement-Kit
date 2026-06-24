use std::fs::{self, File};
use std::io::{Read, Write};
use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use zip::read::ZipArchive;
use zip::write::SimpleFileOptions;
use zip::ZipWriter;

const WORKSPACE_DIRS: &[&str] = &["daily", "weekly", "project", "reference"];

pub fn export_workspace(root: &Path, dest_path: &Path) -> Result<(), String> {
    if dest_path.parent().is_none() {
        return Err("Invalid destination path".into());
    }
    if let Some(parent) = dest_path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let file = File::create(dest_path).map_err(|e| e.to_string())?;
    let mut zip = ZipWriter::new(file);
    let options = SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    for dir_name in WORKSPACE_DIRS {
        let dir_path = root.join(dir_name);
        if !dir_path.is_dir() {
            continue;
        }
        for entry in WalkDir::new(&dir_path).into_iter().filter_map(|e| e.ok()) {
            let path = entry.path();
            if path.file_name().and_then(|n| n.to_str()) == Some(".git") {
                continue;
            }
            let rel = path
                .strip_prefix(root)
                .map_err(|e| e.to_string())?
                .to_string_lossy()
                .replace('\\', "/");

            if path.is_dir() {
                if !rel.is_empty() {
                    zip.add_directory(&rel, options)
                        .map_err(|e| e.to_string())?;
                }
            } else {
                zip.start_file(&rel, options).map_err(|e| e.to_string())?;
                let mut buf = Vec::new();
                File::open(path)
                    .and_then(|mut f| f.read_to_end(&mut buf))
                    .map_err(|e| e.to_string())?;
                zip.write_all(&buf).map_err(|e| e.to_string())?;
            }
        }
    }

    zip.finish().map_err(|e| e.to_string())?;
    Ok(())
}

pub fn import_workspace(root: &Path, source_path: &Path) -> Result<(), String> {
    if !source_path.is_file() {
        return Err("Archive file not found".into());
    }

    let file = File::open(source_path).map_err(|e| e.to_string())?;
    let mut archive = ZipArchive::new(file).map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file = archive.by_index(i).map_err(|e| e.to_string())?;
        let outpath = match file.enclosed_name() {
            Some(path) => root.join(path),
            None => continue,
        };

        if file.name().ends_with('/') {
            fs::create_dir_all(&outpath).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = outpath.parent() {
                fs::create_dir_all(parent).map_err(|e| e.to_string())?;
            }
            let mut outfile = File::create(&outpath).map_err(|e| e.to_string())?;
            std::io::copy(&mut file, &mut outfile).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn resolve_backup_dest(dest_path: &str) -> PathBuf {
    PathBuf::from(dest_path)
}
