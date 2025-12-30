use axum::body::BodyDataStream;
use napi_derive::napi;
use std::{collections::HashMap, sync::Arc};

/// JavaScript-facing request object
#[napi]
pub struct JsRequest {
  method: String,
  url: String,
  headers: HashMap<String, String>,
  query: String,
  body: Arc<BodyDataStream>,
}

#[napi]
impl JsRequest {
  pub fn from_axum(req: &mut axum::extract::Request) -> Self {
    let body = std::mem::replace(req.body_mut(), axum::body::Body::empty()).into_data_stream();

    let headers: HashMap<String, String> = req
      .headers()
      .iter()
      .map(|(k, v)| {
        (
          k.as_str().to_ascii_lowercase(),
          v.to_str().unwrap_or("").to_string(),
        )
      })
      .collect();

    Self {
      method: req.method().to_string(),
      url: req.uri().path().to_string(),
      headers,
      query: req.uri().query().unwrap_or("").to_string(),
      body: Arc::new(body),
    }
  }

  #[napi]
  pub fn get_method(&self) -> String {
    self.method.clone()
  }

  #[napi]
  pub fn get_url(&self) -> String {
    self.url.clone()
  }

  #[napi]
  pub fn get_header(&self, name: String) -> Option<String> {
    self.headers.get(&name.to_ascii_lowercase()).cloned()
  }

  #[napi]
  pub fn get_query(&self) -> String {
    self.query.clone()
  }

  pub fn body_stream_walk(&self) -> Arc<BodyDataStream> {
    self.body.clone()
  }
}
