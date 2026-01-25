use std::path::{Path, PathBuf};

use axum::{
    body::Body,
    http::{HeaderValue, Response, StatusCode, header},
};
use tokio::fs::File;
use tokio::io::AsyncReadExt;

#[inline]
pub async fn try_serve(static_dir: &str, request_path: &str) -> Option<Response<Body>> {
    // Reject obvious non-file paths quickly
    if request_path == "/" {
        return None;
    }

    if request_path.contains("..") {
        return None;
    }

    // Build absolute file path
    let full_path = build_path(static_dir, request_path)?;

    // Try to open file (async)
    let mut file = match File::open(&full_path).await {
        Ok(f) => f,
        Err(_) => return None,
    };

    let mut buf = Vec::new();
    if file.read_to_end(&mut buf).await.is_err() {
        return None;
    }

    let mime = mime_guess::from_path(&full_path)
        .first_or_octet_stream()
        .to_string();

    let response = Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, HeaderValue::from_str(&mime).unwrap())
        .body(Body::from(buf))
        .unwrap();

    Some(response)
}

#[inline(always)]
fn build_path(static_dir: &str, request_path: &str) -> Option<PathBuf> {
    let path = request_path.trim_start_matches('/');

    let mut full = PathBuf::from(static_dir);
    full.push(path);

    if !full.starts_with(Path::new(static_dir)) {
        return None;
    }

    Some(full)
}
