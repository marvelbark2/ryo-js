use axum::body::Body;
use axum::response::Response;
use http::header::{CACHE_CONTROL, CONTENT_TYPE};
use std::path::Path;
use tokio::fs::File;
use tokio_util::io::ReaderStream;

/// Attempt to serve a static file from the given directory
pub async fn try_serve(base_dir: &str, path: &str) -> Option<Response<Body>> {
  // Security: prevent directory traversal
  let clean_path = path.trim_start_matches('/');
  if clean_path.contains("..") {
    return None;
  }

  let file_path = Path::new(base_dir).join(clean_path);

  // Try direct file first
  if let Some(response) = serve_file(&file_path).await {
    return Some(response);
  }

  // Try with .html extension for clean URLs
  let html_path = file_path.with_extension("html");
  if let Some(response) = serve_file(&html_path).await {
    return Some(response);
  }

  // Try index.html for directories
  let index_path = file_path.join("index.html");
  serve_file(&index_path).await
}

async fn serve_file(path: &Path) -> Option<Response<Body>> {
  let file = File::open(path).await.ok()?;
  let metadata = file.metadata().await.ok()?;

  // Determine content type from extension
  let mime_type = mime_guess::from_path(path)
    .first_or_octet_stream()
    .to_string();

  // Create streaming body
  let stream = ReaderStream::new(file);
  let body = Body::from_stream(stream);

  // Build response with proper headers
  let response = Response::builder()
    .status(200)
    .header(CONTENT_TYPE, mime_type)
    .header(CACHE_CONTROL, "public, max-age=31536000, immutable")
    .header("Content-Length", metadata.len())
    .body(body)
    .ok()?;

  Some(response)
}
