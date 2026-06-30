use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct FoundryApiResponse {
    pub status: u16,
    pub body: serde_json::Value,
}

fn validate_stack_url(url: &str) -> Result<String, String> {
    let trimmed = url.trim().trim_end_matches('/');
    if !trimmed.starts_with("https://") {
        return Err("Stack URL must use HTTPS".into());
    }
    if trimmed.contains('@') || trimmed.contains(' ') {
        return Err("Invalid stack URL".into());
    }
    Ok(trimmed.to_string())
}

fn validate_api_path(path: &str) -> Result<String, String> {
    if !path.starts_with("/v2/") {
        return Err("Invalid API path".into());
    }
    if path.contains("..") {
        return Err("Invalid API path".into());
    }
    Ok(path.to_string())
}

#[tauri::command]
pub async fn foundry_api_request(
    stack_url: String,
    token: String,
    method: String,
    path: String,
    body: Option<serde_json::Value>,
) -> Result<FoundryApiResponse, String> {
    let stack_url = validate_stack_url(&stack_url)?;
    let path = validate_api_path(&path)?;
    let method = method.to_uppercase();
    if !["GET", "POST", "PUT", "DELETE", "PATCH"].contains(&method.as_str()) {
        return Err("Unsupported HTTP method".into());
    }

    let url = format!("{stack_url}/api{path}");
    let client = reqwest::Client::new();
    let mut req = client
        .request(
            reqwest::Method::from_bytes(method.as_bytes()).map_err(|e| e.to_string())?,
            &url,
        )
        .header("Authorization", format!("Bearer {}", token.trim()))
        .header("Content-Type", "application/json");

    if let Some(body) = body {
        req = req.json(&body);
    }

    let response = req
        .send()
        .await
        .map_err(|e| format!("Network error: {e}"))?;
    let status = response.status().as_u16();
    let text = response.text().await.map_err(|e| e.to_string())?;

    let body = if text.is_empty() {
        serde_json::Value::Null
    } else {
        serde_json::from_str(&text).unwrap_or(serde_json::Value::String(text))
    };

    Ok(FoundryApiResponse { status, body })
}
