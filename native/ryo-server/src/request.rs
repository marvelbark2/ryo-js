use std::collections::HashMap;

use napi_derive::napi;

#[napi]
pub struct Param {
  pub key: String,
  pub value: String,
}

#[napi]
pub struct JsRequest {
  pub method: String,
  pub path: String,
  params: Option<Vec<Param>>,
  url: String,
  headers: HashMap<String, String>,
}

#[napi]
impl JsRequest {
  // Not exposed to JS (no #[napi] here)
  pub fn from_axum(req: &axum::extract::Request, params: Option<Vec<(String, String)>>) -> Self {
    req.body();
    Self {
      method: req.method().as_str().to_string(),
      path: req.uri().path().to_string(),
      url: req.uri().to_string(),
      headers: req
        .headers()
        .iter()
        .map(|(k, v)| {
          (
            k.as_str().to_lowercase().to_string(),
            v.to_str().unwrap_or_default().to_string(),
          )
        })
        .collect(),
      params: if let Some(p) = params {
        let mut js_params = Vec::new();
        for (k, v) in p {
          js_params.push(Param { key: k, value: v });
        }
        Some(js_params)
      } else {
        None
      },
    }
  }

  #[napi]
  pub fn get_url(&self) -> &str {
    &self.url
  }

  #[napi]
  pub fn get_method(&self) -> &str {
    &self.method
  }

  #[napi]
  pub fn get_header(&self, _name: String) -> String {
    // Headers are not yet implemented in JsRequest
    self
      .headers
      .get(&_name.to_lowercase())
      .cloned()
      .unwrap_or_default()
  }

  #[napi]
  pub fn get_headers(&self) -> HashMap<String, String> {
    self.headers.clone()
  }

  #[napi]
  pub fn get_query(&self) -> String {
    if let Some(pos) = self.url.find('?') {
      self.url[pos + 1..].to_string()
    } else {
      String::new()
    }
  }

  #[napi]
  pub fn get_query_params(&self) -> HashMap<String, String> {
    let mut query_params = HashMap::new();
    if let Some(pos) = self.url.find('?') {
      let query_str = &self.url[pos + 1..];
      for pair in query_str.split('&') {
        let mut iter = pair.splitn(2, '=');
        if let Some(key) = iter.next() {
          let value = iter.next().unwrap_or("");
          query_params.insert(key.to_string(), value.to_string());
        }
      }
    }
    query_params
  }

  #[napi]
  pub fn get_remote_address(&self) -> String {
    // Remote address is not yet implemented in JsRequest
    String::new()
  }

  #[napi]
  pub fn get_parameter(&self, index: u32) -> String {
    if let Some(params) = &self.params {
      if (index as usize) < params.len() {
        params[index as usize].value.clone()
      } else {
        String::new()
      }
    } else {
      String::new()
    }
  }

  #[napi]
  pub fn read_body(&self) -> String {
    // Body reading is not yet implemented in JsRequest
    String::new()
  }
}
