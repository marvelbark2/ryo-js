use napi_derive::napi;
use std::collections::HashMap;

/// JavaScript-facing request object
#[napi]
pub struct JsRequest {
  method: String,
  url: String,
  headers: HashMap<String, String>,
  query: String,
  body: Option<Vec<u8>>,
}

#[napi]
impl JsRequest {
  pub fn from_axum(req: &axum::extract::Request) -> Self {
    let headers: HashMap<String, String> = req
      .headers()
      .iter()
      .map(|(k, v)| (k.as_str().to_string(), v.to_str().unwrap_or("").to_string()))
      .collect();

    Self {
      method: req.method().to_string(),
      url: req.uri().path().to_string(),
      headers,
      query: req.uri().query().unwrap_or("").to_string(),
      body: None,
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
    self.headers.get(&name.to_lowercase()).cloned()
  }

  #[napi]
  pub fn get_query(&self) -> String {
    self.query.clone()
  }
}
