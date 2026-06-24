use serde::Serialize;
use std::fs;
use std::path::Path;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Clone)]
pub struct SearchHit {
    pub path: String,
    pub name: String,
    pub snippet: String,
    pub category: String,
    pub project: Option<String>,
}

fn categorize(rel: &str) -> (String, Option<String>) {
    let parts: Vec<&str> = rel.split('/').collect();
    if parts.is_empty() {
        return ("other".into(), None);
    }
    match parts[0] {
        "daily" => {
            let project = if parts.len() > 2 {
                Some(parts[1].to_string())
            } else {
                None
            };
            ("daily".into(), project)
        }
        "weekly" => {
            let project = if parts.len() > 2 {
                Some(parts[1].to_string())
            } else {
                None
            };
            ("weekly".into(), project)
        }
        "project" => {
            let project = if parts.len() > 1 && parts[1] != "_template" {
                Some(parts[1].to_string())
            } else {
                None
            };
            ("project".into(), project)
        }
        "reference" => ("reference".into(), None),
        _ => ("other".into(), None),
    }
}

fn chars_eq_ignore_case(a: char, b: char) -> bool {
    a.to_lowercase().eq(b.to_lowercase())
}

/// Returns the char index where `needle` first appears in `haystack` (case-insensitive).
fn find_case_insensitive(haystack: &str, needle: &str) -> Option<usize> {
    let needle = needle.trim();
    if needle.is_empty() {
        return None;
    }
    let needle_chars: Vec<char> = needle.chars().collect();
    let haystack_chars: Vec<char> = haystack.chars().collect();
    let n = needle_chars.len();
    for i in 0..=haystack_chars.len().saturating_sub(n) {
        let matched = (0..n).all(|j| chars_eq_ignore_case(haystack_chars[i + j], needle_chars[j]));
        if matched {
            return Some(i);
        }
    }
    None
}

fn snippet_around(content: &str, query: &str, max_len: usize) -> String {
    let chars: Vec<char> = content.chars().collect();
    if let Some(char_idx) = find_case_insensitive(content, query) {
        let query_len = query.chars().count();
        let start = char_idx.saturating_sub(40);
        let end = (char_idx + query_len + 80).min(chars.len());
        let mut s: String = chars[start..end].iter().collect();
        s = s.replace('\n', " ");
        if start > 0 {
            s = format!("…{s}");
        }
        if end < chars.len() {
            s.push('…');
        }
        return s.chars().take(max_len).collect();
    }
    content
        .lines()
        .next()
        .unwrap_or("")
        .chars()
        .take(max_len)
        .collect()
}

pub fn search_workspace(
    root: &Path,
    query: &str,
    project_filter: Option<&str>,
    category_filter: Option<&str>,
) -> Result<Vec<SearchHit>, String> {
    let query_lower = query.trim().to_lowercase();
    if query_lower.len() < 2 {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();

    for entry in WalkDir::new(root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
    {
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
        if ext != "md" && ext != "json" {
            continue;
        }

        let rel = path
            .strip_prefix(root)
            .map_err(|e| e.to_string())?
            .to_string_lossy()
            .to_string();

        if rel.contains(".git") || rel.contains("/_template/") {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        let (category, project) = categorize(&rel);

        if let Some(cf) = category_filter {
            if cf != "all" && cf != category {
                continue;
            }
        }

        if let Some(pf) = project_filter {
            if pf != "all" {
                match &project {
                    Some(p) if p == pf => {}
                    _ => continue,
                }
            }
        }

        let name_match = name.to_lowercase().contains(&query_lower);
        let path_match = rel.to_lowercase().contains(&query_lower);

        let content = match fs::read_to_string(path) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let content_match = find_case_insensitive(&content, &query_lower).is_some();

        if !name_match && !path_match && !content_match {
            continue;
        }

        results.push(SearchHit {
            path: rel.clone(),
            name,
            snippet: if content_match {
                snippet_around(&content, &query_lower, 120)
            } else {
                rel.clone()
            },
            category,
            project,
        });
    }

    results.sort_by(|a, b| a.path.cmp(&b.path));
    results.truncate(100);
    Ok(results)
}
