use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use std::collections::HashMap;
use std::sync::Arc;

pub struct RouteHandler {
  callback: Arc<ThreadsafeFunction<FnArgs<(JsResponse, JsRequest)>, ()>>,
}

impl Clone for RouteHandler {
  fn clone(&self) -> Self {
    Self {
      callback: Arc::clone(&self.callback),
    }
  }
}

impl RouteHandler {
  pub fn new(js_function: Function<FnArgs<(JsResponse, JsRequest)>, ()>) -> Result<Self> {
    let callback = js_function
      .build_threadsafe_function()
      .callee_handled::<true>()
      .build()?;

    Ok(Self {
      callback: Arc::new(callback),
    })
  }

  pub async fn call(
    &self,
    req: axum::extract::Request,
    _params: HashMap<String, String>,
  ) -> Result<axum::response::Response> {
    // Create channels for response streaming
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Vec<u8>>(16);

    let js_req = crate::request::JsRequest::from_axum(&req);
    let js_res = crate::response::JsResponse::new(tx);

    // Call JavaScript handler
    self.callback.call(
      Ok(FnArgs {
        data: (js_res, js_req),
      }),
      ThreadsafeFunctionCallMode::NonBlocking,
    );

    // Collect response data
    let mut body_parts = Vec::new();
    while let Some(chunk) = rx.recv().await {
      body_parts.extend(chunk);
    }

    // Build response
    Ok(
      axum::response::Response::builder()
        .status(200)
        .body(axum::body::Body::from(body_parts))
        .unwrap(),
    )
  }
}

pub struct Router {
  routes: HashMap<String, Vec<(String, RouteHandler)>>,
}

impl Router {
  pub fn new() -> Self {
    Self {
      routes: HashMap::new(),
    }
  }

  pub fn add_route(&mut self, method: &str, pattern: &str, handler: RouteHandler) {
    self
      .routes
      .entry(method.to_uppercase())
      .or_insert_with(Vec::new)
      .push((pattern.to_string(), handler));
  }

  pub fn match_route(
    &self,
    method: &str,
    path: &str,
  ) -> Option<(&RouteHandler, HashMap<String, String>)> {
    let routes = self.routes.get(method)?;

    for (pattern, handler) in routes {
      if pattern == path {
        return Some((handler, HashMap::new()));
      }
      // Add pattern matching logic here if needed
    }

    None
  }
}

// Placeholder types that need to be imported from request/response
use crate::request::JsRequest;
use crate::response::JsResponse;
