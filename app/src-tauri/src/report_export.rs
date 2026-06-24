use printpdf::*;
use serde_json::Value;
use std::fs;
use std::io::BufWriter;
use std::path::Path;

#[derive(Debug, Clone)]
struct ReportSection {
    title: String,
    body: String,
}

pub(crate) struct ProjectReport {
    title: String,
    customer: String,
    status: String,
    generated_at: String,
    sections: Vec<ReportSection>,
    reference_files: Vec<String>,
    architecture: Option<String>,
    daily_entries: Vec<String>,
    weekly_entries: Vec<String>,
}

fn strip_frontmatter(content: &str) -> &str {
    if content.starts_with("---") {
        if let Some(end) = content[3..].find("\n---") {
            return content[3 + end + 4..].trim_start();
        }
    }
    content
}

fn markdown_to_plain(md: &str) -> String {
    let mut out = String::new();
    for line in strip_frontmatter(md).lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("```") {
            continue;
        }
        let cleaned = trimmed
            .trim_start_matches('#')
            .trim()
            .replace("**", "")
            .replace('*', "")
            .replace('`', "");
        if !cleaned.is_empty() {
            out.push_str(&cleaned);
            out.push('\n');
        }
    }
    out.trim().to_string()
}

fn read_optional(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok()
}

fn architecture_to_text(json: &Value) -> String {
    let mut lines = vec!["Architecture overview:".to_string()];
    if let Some(nodes) = json.get("nodes").and_then(|n| n.as_array()) {
        for node in nodes {
            let label = node
                .pointer("/data/label")
                .and_then(|v| v.as_str())
                .unwrap_or("Node");
            let kind = node.get("type").and_then(|v| v.as_str()).unwrap_or("");
            lines.push(format!("  - [{kind}] {label}"));
        }
    }
    if let Some(edges) = json.get("edges").and_then(|e| e.as_array()) {
        lines.push("Connections:".to_string());
        for edge in edges {
            let src = edge.get("source").and_then(|v| v.as_str()).unwrap_or("?");
            let tgt = edge.get("target").and_then(|v| v.as_str()).unwrap_or("?");
            let label = edge.get("label").and_then(|v| v.as_str()).unwrap_or("");
            if label.is_empty() {
                lines.push(format!("  {src} -> {tgt}"));
            } else {
                lines.push(format!("  {src} -- {label} -> {tgt}"));
            }
        }
    }
    lines.join("\n")
}

fn collect_md_sections(project_dir: &Path, project_rel: &str) -> Vec<ReportSection> {
    let docs = [
        ("Overview", "README.md"),
        ("Discovery", "00-discovery/discovery.md"),
        ("Scoping", "01-scoping/scoping.md"),
        ("Design", "02-design/design-overview.md"),
        ("Ontology", "02-design/ontology-design.md"),
        ("Pipelines", "02-design/pipeline-design.md"),
        ("Workshop", "02-design/workshop-spec.md"),
        ("Build", "03-build/build-tracker.md"),
        ("Deploy", "04-deploy/go-live-checklist.md"),
        ("Handoff", "05-handoff/handoff.md"),
    ];
    let mut sections = Vec::new();
    for (title, rel) in docs {
        let path = project_dir.join(rel);
        if let Some(content) = read_optional(&path) {
            let body = markdown_to_plain(&content);
            if !body.is_empty() {
                sections.push(ReportSection {
                    title: title.to_string(),
                    body,
                });
            }
        }
    }
    let _ = project_rel;
    sections
}

fn collect_reference_files(project_dir: &Path) -> Vec<String> {
    let mut files = Vec::new();
    let refs_dir = project_dir.join("references");
    if refs_dir.is_dir() {
        if let Ok(entries) = fs::read_dir(&refs_dir) {
            for entry in entries.flatten() {
                if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                    files.push(entry.file_name().to_string_lossy().to_string());
                }
            }
        }
    }
    files.sort();
    files
}

fn collect_journal_entries(base: &Path, slug: &str) -> Vec<String> {
    let mut entries = Vec::new();
    let project_folder = base.join(slug);
    if project_folder.is_dir() {
        if let Ok(read) = fs::read_dir(&project_folder) {
            for entry in read.flatten() {
                if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.ends_with(".md") {
                            if let Ok(content) = fs::read_to_string(entry.path()) {
                                entries.push(format!("### {name}\n\n{}", markdown_to_plain(&content)));
                            }
                        }
                    }
                }
            }
        }
    }
    for entry in walkdir::WalkDir::new(base).max_depth(2) {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };
        if !entry.file_type().is_file() {
            continue;
        }
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("md") {
            continue;
        }
        if let Ok(content) = fs::read_to_string(path) {
            if content.contains(&format!("project: {slug}"))
                || content.contains(&format!("project: {slug}\n"))
            {
                let name = entry.file_name().to_string_lossy().to_string();
                if !entries.iter().any(|e| e.contains(&name)) {
                    entries.push(format!("### {name}\n\n{}", markdown_to_plain(&content)));
                }
            }
        }
    }
    entries.sort();
    entries
}

pub fn build_report(workspace: &Path, project_rel: &str) -> Result<ProjectReport, String> {
    let project_dir = workspace.join(project_rel);
    if !project_dir.is_dir() {
        return Err("Project not found".into());
    }

    let slug = project_rel
        .strip_prefix("project/")
        .unwrap_or(project_rel)
        .to_string();

    let meta_path = project_dir.join("engagement.json");
    let meta: Value = if meta_path.exists() {
        serde_json::from_str(&fs::read_to_string(&meta_path).map_err(|e| e.to_string())?)
            .unwrap_or(Value::Null)
    } else {
        Value::Null
    };

    let title = meta
        .get("displayName")
        .and_then(|v| v.as_str())
        .unwrap_or(&slug)
        .to_string();
    let customer = meta
        .get("customer")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string();
    let status = meta
        .get("status")
        .and_then(|v| v.as_str())
        .unwrap_or("discovery")
        .to_string();

    let architecture = project_dir.join("02-design/architecture.json");
    let architecture_text = if architecture.exists() {
        fs::read_to_string(&architecture)
            .ok()
            .and_then(|s| serde_json::from_str::<Value>(&s).ok())
            .map(|v| architecture_to_text(&v))
    } else {
        None
    };

    let daily_base = workspace.join("daily");
    let weekly_base = workspace.join("weekly");

    Ok(ProjectReport {
        title: title.clone(),
        customer,
        status,
        generated_at: chrono::Local::now().format("%Y-%m-%d %H:%M").to_string(),
        sections: collect_md_sections(&project_dir, project_rel),
        reference_files: collect_reference_files(&project_dir),
        architecture: architecture_text,
        daily_entries: collect_journal_entries(&daily_base, &slug),
        weekly_entries: collect_journal_entries(&weekly_base, &slug),
    })
}

fn wrap_text(text: &str, max_chars: usize) -> Vec<String> {
    let mut lines = Vec::new();
    for paragraph in text.split('\n') {
        let words: Vec<&str> = paragraph.split_whitespace().collect();
        if words.is_empty() {
            lines.push(String::new());
            continue;
        }
        let mut current = String::new();
        for word in words {
            if current.is_empty() {
                current = word.to_string();
            } else if current.len() + 1 + word.len() <= max_chars {
                current.push(' ');
                current.push_str(word);
            } else {
                lines.push(current);
                current = word.to_string();
            }
        }
        if !current.is_empty() {
            lines.push(current);
        }
    }
    lines
}

pub fn export_pdf(report: &ProjectReport, dest: &Path) -> Result<(), String> {
    let (doc, page1, layer1) =
        PdfDocument::new(&report.title, Mm(210.0), Mm(297.0), "Layer 1");
    let font_bold = doc
        .add_builtin_font(BuiltinFont::HelveticaBold)
        .map_err(|e| e.to_string())?;
    let font_reg = doc
        .add_builtin_font(BuiltinFont::Helvetica)
        .map_err(|e| e.to_string())?;

    struct PdfWriter {
        doc: PdfDocumentReference,
        page: PdfPageIndex,
        layer: PdfLayerIndex,
        y: f32,
    }

    impl PdfWriter {
        fn write_line(
            &mut self,
            font_bold: &IndirectFontRef,
            font_reg: &IndirectFontRef,
            text: &str,
            size: f32,
            bold: bool,
        ) {
            if self.y < 20.0 {
                let (new_page, new_layer) = self.doc.add_page(Mm(210.0), Mm(297.0), "Layer");
                self.page = new_page;
                self.layer = new_layer;
                self.y = 280.0;
            }
            let font = if bold { font_bold } else { font_reg };
            self.doc
                .get_page(self.page)
                .get_layer(self.layer)
                .use_text(text, size, Mm(20.0), Mm(self.y), font);
            self.y -= size * 0.5 + 2.0;
        }
    }

    let mut writer = PdfWriter {
        doc,
        page: page1,
        layer: layer1,
        y: 280.0,
    };

    writer.write_line(&font_bold, &font_reg, &report.title, 22.0, true);
    writer.write_line(
        &font_bold,
        &font_reg,
        &format!("Customer: {} | Status: {}", report.customer, report.status),
        11.0,
        false,
    );
    writer.write_line(
        &font_bold,
        &font_reg,
        &format!("Generated: {}", report.generated_at),
        10.0,
        false,
    );
    writer.y -= 4.0;

    for section in &report.sections {
        writer.write_line(&font_bold, &font_reg, &section.title, 14.0, true);
        for line in wrap_text(&section.body, 90) {
            writer.write_line(&font_bold, &font_reg, &line, 10.0, false);
        }
        writer.y -= 4.0;
    }

    if let Some(arch) = &report.architecture {
        writer.write_line(&font_bold, &font_reg, "Architecture", 14.0, true);
        for line in wrap_text(arch, 90) {
            writer.write_line(&font_bold, &font_reg, &line, 10.0, false);
        }
    }

    if !report.reference_files.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Reference files", 14.0, true);
        for f in &report.reference_files {
            writer.write_line(&font_bold, &font_reg, &format!("  - {f}"), 10.0, false);
        }
    }

    if !report.daily_entries.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Daily standups", 14.0, true);
        for entry in &report.daily_entries {
            for line in wrap_text(entry, 90) {
                writer.write_line(&font_bold, &font_reg, &line, 9.0, false);
            }
        }
    }

    if !report.weekly_entries.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Weekly reviews", 14.0, true);
        for entry in &report.weekly_entries {
            for line in wrap_text(entry, 90) {
                writer.write_line(&font_bold, &font_reg, &line, 9.0, false);
            }
        }
    }

    let file = fs::File::create(dest).map_err(|e| e.to_string())?;
    writer
        .doc
        .save(&mut BufWriter::new(file))
        .map_err(|e| e.to_string())
}

pub fn export_docx(report: &ProjectReport, dest: &Path) -> Result<(), String> {
    use docx_rs::*;

    let mut docx = Docx::new().add_paragraph(
        Paragraph::new().add_run(Run::new().add_text(&report.title).size(32).bold()),
    );
    docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(format!(
        "Customer: {} | Status: {} | Generated: {}",
        report.customer, report.status, report.generated_at
    ))));
    docx = docx.add_paragraph(Paragraph::new());

    for section in &report.sections {
        docx = docx.add_paragraph(
            Paragraph::new().add_run(Run::new().add_text(&section.title).size(24).bold()),
        );
        for para in section.body.split("\n\n") {
            if !para.trim().is_empty() {
                docx = docx.add_paragraph(
                    Paragraph::new().add_run(Run::new().add_text(para.trim())),
                );
            }
        }
        docx = docx.add_paragraph(Paragraph::new());
    }

    if let Some(arch) = &report.architecture {
        docx = docx.add_paragraph(
            Paragraph::new().add_run(Run::new().add_text("Architecture").size(24).bold()),
        );
        for line in arch.lines() {
            docx = docx.add_paragraph(Paragraph::new().add_run(Run::new().add_text(line)));
        }
        docx = docx.add_paragraph(Paragraph::new());
    }

    if !report.reference_files.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new().add_run(Run::new().add_text("Reference files").size(24).bold()),
        );
        for f in &report.reference_files {
            docx = docx.add_paragraph(
                Paragraph::new().add_run(Run::new().add_text(format!("• {f}"))),
            );
        }
        docx = docx.add_paragraph(Paragraph::new());
    }

    if !report.daily_entries.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new().add_run(Run::new().add_text("Daily standups").size(24).bold()),
        );
        for entry in &report.daily_entries {
            for para in entry.split("\n\n") {
                if !para.trim().is_empty() {
                    docx = docx.add_paragraph(
                        Paragraph::new().add_run(Run::new().add_text(para.trim())),
                    );
                }
            }
        }
    }

    if !report.weekly_entries.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new().add_run(Run::new().add_text("Weekly reviews").size(24).bold()),
        );
        for entry in &report.weekly_entries {
            for para in entry.split("\n\n") {
                if !para.trim().is_empty() {
                    docx = docx.add_paragraph(
                        Paragraph::new().add_run(Run::new().add_text(para.trim())),
                    );
                }
            }
        }
    }

    let file = fs::File::create(dest).map_err(|e| e.to_string())?;
    docx.build()
        .pack(BufWriter::new(file))
        .map_err(|e| e.to_string())
}

pub fn export_report(
    workspace: &Path,
    project_rel: &str,
    format: &str,
    dest: &Path,
) -> Result<(), String> {
    let report = build_report(workspace, project_rel)?;
    match format.to_lowercase().as_str() {
        "pdf" => export_pdf(&report, dest),
        "docx" | "word" => export_docx(&report, dest),
        _ => Err(format!("Unsupported format: {format}. Use pdf or docx.")),
    }
}
