use printpdf::*;
use serde_json::Value;
use std::fs;
use std::io::BufWriter;
use std::path::Path;

#[derive(Debug, Clone)]
struct ReportSection {
    title: String,
    blocks: Vec<MdBlock>,
}

#[derive(Debug, Clone)]
enum MdBlock {
    Heading { level: u8, text: String },
    Paragraph(String),
    Bullet(String),
    Numbered { index: u32, text: String },
    Table { headers: Vec<String>, rows: Vec<Vec<String>> },
    Quote(String),
    Code(String),
    Rule,
}

pub(crate) struct ProjectReport {
    title: String,
    customer: String,
    status: String,
    generated_at: String,
    sections: Vec<ReportSection>,
    reference_files: Vec<String>,
    architecture: Option<Vec<MdBlock>>,
    daily_entries: Vec<(String, Vec<MdBlock>)>,
    weekly_entries: Vec<(String, Vec<MdBlock>)>,
}

fn strip_frontmatter(content: &str) -> &str {
    if content.starts_with("---") {
        if let Some(end) = content[3..].find("\n---") {
            return content[3 + end + 4..].trim_start();
        }
    }
    content
}

fn clean_inline(text: &str) -> String {
    let mut out = text.to_string();
    while let Some(start) = out.find("**") {
        if let Some(end) = out[start + 2..].find("**") {
            let inner = out[start + 2..start + 2 + end].to_string();
            out.replace_range(start..start + 4 + end, &inner);
        } else {
            break;
        }
    }
    out = out.replace('`', "");
    if let Some(idx) = out.find('[') {
        if let Some(end) = out[idx..].find("](") {
            if let Some(close) = out[idx + end..].find(')') {
                let link_text = out[idx + 1..idx + end].trim().to_string();
                let range = idx..idx + end + close + 1;
                out.replace_range(range, &link_text);
            }
        }
    }
    out.trim().to_string()
}

fn parse_table_row(line: &str) -> Vec<String> {
    line.trim()
        .trim_matches('|')
        .split('|')
        .map(|c| clean_inline(c.trim()))
        .filter(|c| !c.is_empty())
        .collect()
}

fn is_table_separator(line: &str) -> bool {
    let t = line.trim();
    t.starts_with('|') && t.chars().all(|c| c == '|' || c == '-' || c == ':' || c.is_whitespace())
}

fn parse_markdown_blocks(md: &str) -> Vec<MdBlock> {
    let body = strip_frontmatter(md);
    let lines: Vec<&str> = body.lines().collect();
    let mut blocks = Vec::new();
    let mut i = 0;

    while i < lines.len() {
        let trimmed = lines[i].trim();
        if trimmed.is_empty() {
            i += 1;
            continue;
        }

        if trimmed.starts_with("```") {
            i += 1;
            let mut code = String::new();
            while i < lines.len() && !lines[i].trim().starts_with("```") {
                code.push_str(lines[i]);
                code.push('\n');
                i += 1;
            }
            if !code.trim().is_empty() {
                blocks.push(MdBlock::Code(code.trim().to_string()));
            }
            if i < lines.len() {
                i += 1;
            }
            continue;
        }

        if trimmed.starts_with('#') {
            let level = trimmed.chars().take_while(|c| *c == '#').count().min(6) as u8;
            let text = clean_inline(trimmed[level as usize..].trim());
            if !text.is_empty() {
                blocks.push(MdBlock::Heading { level, text });
            }
            i += 1;
            continue;
        }

        if trimmed.starts_with("|") && trimmed.ends_with('|') {
            let headers = parse_table_row(trimmed);
            i += 1;
            if i < lines.len() && is_table_separator(lines[i]) {
                i += 1;
            }
            let mut rows = Vec::new();
            while i < lines.len() {
                let row_line = lines[i].trim();
                if !row_line.starts_with('|') {
                    break;
                }
                rows.push(parse_table_row(row_line));
                i += 1;
            }
            if !headers.is_empty() {
                blocks.push(MdBlock::Table { headers, rows });
            }
            continue;
        }

        if trimmed.starts_with("- ") || trimmed.starts_with("* ") {
            blocks.push(MdBlock::Bullet(clean_inline(&trimmed[2..])));
            i += 1;
            continue;
        }

        if let Some(dot) = trimmed.find(". ") {
            let prefix = &trimmed[..dot];
            if !prefix.is_empty() && prefix.chars().all(|c| c.is_ascii_digit()) {
                if let Ok(n) = prefix.parse::<u32>() {
                    blocks.push(MdBlock::Numbered {
                        index: n,
                        text: clean_inline(&trimmed[dot + 2..]),
                    });
                    i += 1;
                    continue;
                }
            }
        }

        if trimmed == "---" || trimmed == "***" {
            blocks.push(MdBlock::Rule);
            i += 1;
            continue;
        }

        if trimmed.starts_with('>') {
            blocks.push(MdBlock::Quote(clean_inline(trimmed.trim_start_matches('>').trim())));
            i += 1;
            continue;
        }

        let mut para = clean_inline(trimmed);
        i += 1;
        while i < lines.len() {
            let next = lines[i].trim();
            if next.is_empty()
                || next.starts_with('#')
                || next.starts_with('|')
                || next.starts_with("```")
                || next.starts_with("- ")
                || next.starts_with("* ")
                || next.starts_with('>')
                || next == "---"
            {
                break;
            }
            if let Some(dot) = next.find(". ") {
                let prefix = &next[..dot];
                if !prefix.is_empty() && prefix.chars().all(|c| c.is_ascii_digit()) {
                    break;
                }
            }
            para.push(' ');
            para.push_str(&clean_inline(next));
            i += 1;
        }
        if !para.is_empty() {
            blocks.push(MdBlock::Paragraph(para));
        }
    }

    blocks
}

fn read_optional(path: &Path) -> Option<String> {
    fs::read_to_string(path).ok()
}

fn architecture_to_blocks(json: &Value) -> Vec<MdBlock> {
    let mut blocks = vec![MdBlock::Heading {
        level: 2,
        text: "Architecture overview".to_string(),
    }];
    if let Some(nodes) = json.get("nodes").and_then(|n| n.as_array()) {
        blocks.push(MdBlock::Heading {
            level: 3,
            text: "Components".to_string(),
        });
        for node in nodes {
            let label = node
                .pointer("/data/label")
                .and_then(|v| v.as_str())
                .unwrap_or("Node");
            let kind = node.get("type").and_then(|v| v.as_str()).unwrap_or("");
            blocks.push(MdBlock::Bullet(format!("[{kind}] {label}")));
        }
    }
    if let Some(edges) = json.get("edges").and_then(|e| e.as_array()) {
        if !edges.is_empty() {
            blocks.push(MdBlock::Heading {
                level: 3,
                text: "Connections".to_string(),
            });
            for edge in edges {
                let src = edge.get("source").and_then(|v| v.as_str()).unwrap_or("?");
                let tgt = edge.get("target").and_then(|v| v.as_str()).unwrap_or("?");
                let label = edge.get("label").and_then(|v| v.as_str()).unwrap_or("");
                let text = if label.is_empty() {
                    format!("{src} → {tgt}")
                } else {
                    format!("{src} — {label} → {tgt}")
                };
                blocks.push(MdBlock::Bullet(text));
            }
        }
    }
    blocks
}

fn collect_md_sections(project_dir: &Path) -> Vec<ReportSection> {
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
            let blocks = parse_markdown_blocks(&content);
            if !blocks.is_empty() {
                sections.push(ReportSection {
                    title: title.to_string(),
                    blocks,
                });
            }
        }
    }
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

fn collect_journal_entries(base: &Path, slug: &str) -> Vec<(String, Vec<MdBlock>)> {
    let mut entries = Vec::new();
    let project_folder = base.join(slug);
    if project_folder.is_dir() {
        if let Ok(read) = fs::read_dir(&project_folder) {
            for entry in read.flatten() {
                if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                    if let Some(name) = entry.file_name().to_str() {
                        if name.ends_with(".md") {
                            if let Ok(content) = fs::read_to_string(entry.path()) {
                                entries.push((name.to_string(), parse_markdown_blocks(&content)));
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
                if !entries.iter().any(|(n, _)| n == &name) {
                    entries.push((name, parse_markdown_blocks(&content)));
                }
            }
        }
    }
    entries.sort_by(|a, b| a.0.cmp(&b.0));
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
    let architecture_blocks = if architecture.exists() {
        fs::read_to_string(&architecture)
            .ok()
            .and_then(|s| serde_json::from_str::<Value>(&s).ok())
            .map(|v| architecture_to_blocks(&v))
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
        sections: collect_md_sections(&project_dir),
        reference_files: collect_reference_files(&project_dir),
        architecture: architecture_blocks,
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

struct PdfWriter {
    doc: PdfDocumentReference,
    page: PdfPageIndex,
    layer: PdfLayerIndex,
    y: f32,
}

impl PdfWriter {
    fn new(doc: PdfDocumentReference, page: PdfPageIndex, layer: PdfLayerIndex) -> Self {
        Self {
            doc,
            page,
            layer,
            y: 270.0,
        }
    }

    fn new_page(&mut self) {
        let (page, layer) = self.doc.add_page(Mm(210.0), Mm(297.0), "Layer");
        self.page = page;
        self.layer = layer;
        self.y = 270.0;
    }

    fn ensure_space(&mut self, needed: f32) {
        if self.y - needed < 18.0 {
            self.new_page();
        }
    }

    fn write_line(
        &mut self,
        font_bold: &IndirectFontRef,
        font_reg: &IndirectFontRef,
        text: &str,
        size: f32,
        bold: bool,
        indent_mm: f32,
    ) {
        if text.is_empty() {
            self.y -= size * 0.35;
            return;
        }
        self.ensure_space(size * 0.6 + 2.0);
        let font = if bold { font_bold } else { font_reg };
        self.doc
            .get_page(self.page)
            .get_layer(self.layer)
            .use_text(text, size, Mm(20.0 + indent_mm), Mm(self.y), font);
        self.y -= size * 0.55 + 2.5;
    }

    fn write_wrapped(
        &mut self,
        font_bold: &IndirectFontRef,
        font_reg: &IndirectFontRef,
        text: &str,
        size: f32,
        bold: bool,
        indent_mm: f32,
        max_chars: usize,
    ) {
        for line in wrap_text(text, max_chars) {
            self.write_line(font_bold, font_reg, &line, size, bold, indent_mm);
        }
    }

    fn write_blocks(
        &mut self,
        font_bold: &IndirectFontRef,
        font_reg: &IndirectFontRef,
        blocks: &[MdBlock],
        base_size: f32,
    ) {
        for block in blocks {
            match block {
                MdBlock::Heading { level, text } => {
                    self.y -= 2.0;
                    let size = match level {
                        1 => 16.0,
                        2 => 14.0,
                        3 => 12.0,
                        _ => 11.0,
                    };
                    self.write_line(font_bold, font_reg, text, size, true, 0.0);
                    self.y -= 1.0;
                }
                MdBlock::Paragraph(text) => {
                    self.write_wrapped(font_bold, font_reg, text, base_size, false, 0.0, 82);
                    self.y -= 1.5;
                }
                MdBlock::Bullet(text) => {
                    self.write_wrapped(font_bold, font_reg, &format!("• {text}"), base_size, false, 4.0, 78);
                }
                MdBlock::Numbered { index, text } => {
                    self.write_wrapped(
                        font_bold,
                        font_reg,
                        &format!("{index}. {text}"),
                        base_size,
                        false,
                        4.0,
                        78,
                    );
                }
                MdBlock::Table { headers, rows } => {
                    self.write_line(font_bold, font_reg, &headers.join("  ·  "), base_size, true, 0.0);
                    for row in rows {
                        self.write_line(font_bold, font_reg, &row.join("  ·  "), base_size - 0.5, false, 4.0);
                    }
                    self.y -= 2.0;
                }
                MdBlock::Quote(text) => {
                    self.write_wrapped(font_bold, font_reg, text, base_size, false, 6.0, 76);
                }
                MdBlock::Code(text) => {
                    for line in text.lines() {
                        self.write_line(font_reg, font_reg, line, base_size - 1.0, false, 6.0);
                    }
                    self.y -= 1.0;
                }
                MdBlock::Rule => {
                    self.write_line(font_reg, font_reg, "— — —", base_size, false, 0.0);
                    self.y -= 2.0;
                }
            }
        }
    }
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

    let mut writer = PdfWriter::new(doc, page1, layer1);

    writer.write_line(&font_bold, &font_reg, &report.title, 22.0, true, 0.0);
    writer.write_line(
        &font_bold,
        &font_reg,
        &format!("Customer: {}", report.customer),
        11.0,
        false,
        0.0,
    );
    writer.write_line(
        &font_bold,
        &font_reg,
        &format!("Phase: {}", report.status),
        11.0,
        false,
        0.0,
    );
    writer.write_line(
        &font_bold,
        &font_reg,
        &format!("Generated: {}", report.generated_at),
        10.0,
        false,
        0.0,
    );
    writer.y -= 6.0;

    if !report.sections.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Contents", 13.0, true, 0.0);
        for (i, section) in report.sections.iter().enumerate() {
            writer.write_line(
                &font_bold,
                &font_reg,
                &format!("  {}. {}", i + 1, section.title),
                10.0,
                false,
                0.0,
            );
        }
        writer.new_page();
    }

    for section in &report.sections {
        writer.write_line(&font_bold, &font_reg, &section.title, 16.0, true, 0.0);
        writer.y -= 2.0;
        writer.write_blocks(&font_bold, &font_reg, &section.blocks, 10.5);
        writer.y -= 6.0;
    }

    if let Some(arch) = &report.architecture {
        writer.write_line(&font_bold, &font_reg, "Architecture", 16.0, true, 0.0);
        writer.write_blocks(&font_bold, &font_reg, arch, 10.5);
        writer.y -= 4.0;
    }

    if !report.reference_files.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Reference files", 14.0, true, 0.0);
        for f in &report.reference_files {
            writer.write_line(&font_bold, &font_reg, &format!("• {f}"), 10.0, false, 4.0);
        }
        writer.y -= 4.0;
    }

    if !report.daily_entries.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Daily standups", 16.0, true, 0.0);
        for (name, blocks) in &report.daily_entries {
            writer.write_line(&font_bold, &font_reg, name, 12.0, true, 0.0);
            writer.write_blocks(&font_bold, &font_reg, blocks, 10.0);
            writer.y -= 3.0;
        }
    }

    if !report.weekly_entries.is_empty() {
        writer.write_line(&font_bold, &font_reg, "Weekly reviews", 16.0, true, 0.0);
        for (name, blocks) in &report.weekly_entries {
            writer.write_line(&font_bold, &font_reg, name, 12.0, true, 0.0);
            writer.write_blocks(&font_bold, &font_reg, blocks, 10.0);
            writer.y -= 3.0;
        }
    }

    let file = fs::File::create(dest).map_err(|e| e.to_string())?;
    writer
        .doc
        .save(&mut BufWriter::new(file))
        .map_err(|e| e.to_string())
}

fn add_blocks_to_docx(docx: docx_rs::Docx, blocks: &[MdBlock]) -> docx_rs::Docx {
    use docx_rs::*;
    let mut docx = docx;
    for block in blocks {
        docx = match block {
            MdBlock::Heading { level, text } => {
                let size = match level {
                    1 => 32,
                    2 => 26,
                    3 => 22,
                    _ => 20,
                };
                docx.add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(text).size(size).bold())
                        .line_spacing(LineSpacing::new().before(240).after(120)),
                )
            }
            MdBlock::Paragraph(text) => docx.add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text(text))
                    .line_spacing(LineSpacing::new().after(160)),
            ),
            MdBlock::Bullet(text) => docx.add_paragraph(
                Paragraph::new()
                    .indent(Some(360), None, None, None)
                    .add_run(Run::new().add_text(format!("• {text}")))
                    .line_spacing(LineSpacing::new().after(80)),
            ),
            MdBlock::Numbered { index, text } => docx.add_paragraph(
                Paragraph::new()
                    .indent(Some(360), None, None, None)
                    .add_run(Run::new().add_text(format!("{index}. {text}")))
                    .line_spacing(LineSpacing::new().after(80)),
            ),
            MdBlock::Table { headers, rows } => {
                let mut d = docx.add_paragraph(
                    Paragraph::new()
                        .add_run(Run::new().add_text(headers.join("  |  ")).bold())
                        .line_spacing(LineSpacing::new().before(120).after(80)),
                );
                for row in rows {
                    d = d.add_paragraph(
                        Paragraph::new()
                            .indent(Some(360), None, None, None)
                            .add_run(Run::new().add_text(row.join("  |  ")))
                            .line_spacing(LineSpacing::new().after(80)),
                    );
                }
                d
            }
            MdBlock::Quote(text) => docx.add_paragraph(
                Paragraph::new()
                    .indent(Some(720), None, None, None)
                    .add_run(Run::new().add_text(text).italic())
                    .line_spacing(LineSpacing::new().after(120)),
            ),
            MdBlock::Code(text) => {
                let mut d = docx;
                for line in text.lines() {
                    d = d.add_paragraph(
                        Paragraph::new()
                            .indent(Some(360), None, None, None)
                            .add_run(
                                Run::new()
                                    .add_text(line)
                                    .fonts(RunFonts::new().ascii("Courier New")),
                            )
                            .line_spacing(LineSpacing::new().after(60)),
                    );
                }
                d
            }
            MdBlock::Rule => docx.add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text("— — —"))
                    .line_spacing(LineSpacing::new().before(120).after(120)),
            ),
        };
    }
    docx
}

pub fn export_docx(report: &ProjectReport, dest: &Path) -> Result<(), String> {
    use docx_rs::*;

    let mut docx = Docx::new()
        .add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(&report.title).size(36).bold())
                .line_spacing(LineSpacing::new().before(240).after(120)),
        )
        .add_paragraph(
            Paragraph::new().add_run(Run::new().add_text(format!(
                "Customer: {}  ·  Phase: {}  ·  Generated: {}",
                report.customer, report.status, report.generated_at
            ))),
        )
        .add_paragraph(Paragraph::new());

    if !report.sections.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text("Contents").size(24).bold())
                .line_spacing(LineSpacing::new().before(240).after(120)),
        );
        for (i, section) in report.sections.iter().enumerate() {
            docx = docx.add_paragraph(
                Paragraph::new().add_run(Run::new().add_text(format!(
                    "{}. {}",
                    i + 1,
                    section.title
                ))),
            );
        }
        docx = docx.add_paragraph(Paragraph::new().page_break_before(true));
    }

    for section in &report.sections {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text(&section.title).size(28).bold())
                .line_spacing(LineSpacing::new().before(240).after(160)),
        );
        docx = add_blocks_to_docx(docx, &section.blocks);
        docx = docx.add_paragraph(Paragraph::new());
    }

    if let Some(arch) = &report.architecture {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text("Architecture").size(28).bold())
                .line_spacing(LineSpacing::new().before(240).after(160)),
        );
        docx = add_blocks_to_docx(docx, arch);
        docx = docx.add_paragraph(Paragraph::new());
    }

    if !report.reference_files.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text("Reference files").size(24).bold())
                .line_spacing(LineSpacing::new().before(240).after(120)),
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
            Paragraph::new()
                .add_run(Run::new().add_text("Daily standups").size(28).bold())
                .line_spacing(LineSpacing::new().before(240).after(160)),
        );
        for (name, blocks) in &report.daily_entries {
            docx = docx.add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text(name).size(22).bold())
                    .line_spacing(LineSpacing::new().before(160).after(80)),
            );
            docx = add_blocks_to_docx(docx, blocks);
        }
    }

    if !report.weekly_entries.is_empty() {
        docx = docx.add_paragraph(
            Paragraph::new()
                .add_run(Run::new().add_text("Weekly reviews").size(28).bold())
                .line_spacing(LineSpacing::new().before(240).after(160)),
        );
        for (name, blocks) in &report.weekly_entries {
            docx = docx.add_paragraph(
                Paragraph::new()
                    .add_run(Run::new().add_text(name).size(22).bold())
                    .line_spacing(LineSpacing::new().before(160).after(80)),
            );
            docx = add_blocks_to_docx(docx, blocks);
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
