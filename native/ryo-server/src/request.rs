use napi_derive::napi;

#[napi(object)]
pub struct Param {
  pub key: String,
  pub value: String,
}

#[napi(object)]
pub struct JsRequest {
  pub method: String,
  pub path: String,
  pub params: Vec<Param>,
}

impl JsRequest {
  // Not exposed to JS (no #[napi] here)
  pub fn from_axum(
    req: &axum::extract::Request,
    params: Vec<(String, String)>,
  ) -> Self {
    Self {
      method: req.method().as_str().to_string(),
      path: req.uri().path().to_string(),
      params: params
        .into_iter()
        .map(|(key, value)| Param { key, value })
        .collect(),
    }
  }
}
