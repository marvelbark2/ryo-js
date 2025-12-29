use axum::body::Body;
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
    mut req: axum::extract::Request,
    _params: HashMap<String, String>,
  ) -> Result<axum::response::Response> {
    // Create channels for response streaming
    let (tx, mut rx) = tokio::sync::mpsc::channel::<Vec<u8>>(16);

    let js_req = crate::request::JsRequest::from_axum(&mut req);
    let js_res = crate::response::JsResponse::new(tx);

    // Call JavaScript handler
    self.callback.call(
      Ok(FnArgs {
        data: (js_res, js_req),
      }),
      ThreadsafeFunctionCallMode::NonBlocking,
    );

    // Collect response data
    let mut body_parts: Vec<u8> = Vec::new();
    while let Some(chunk) = rx.recv().await {
      body_parts.reserve(chunk.len());
      body_parts.extend_from_slice(&chunk);
    }

    Ok(
      axum::response::Response::builder()
        .status(200)
        .body(axum::body::Body::from(body_parts))
        .unwrap(),
    )
  }
}

pub struct Router {
  routes: HashMap<String, HashMap<String, RouteHandler>>,
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
      .entry(method.to_string())
      .or_insert_with(HashMap::new)
      .insert(pattern.to_string(), handler);
  }

  pub fn match_route(
    &self,
    method: &str,
    path: &str,
  ) -> Option<(&RouteHandler, HashMap<String, String>)> {
    let routes = match self.routes.get(method) {
      Some(routes) => routes,
      None => {
        let upper = method.to_uppercase();
        self.routes.get(&upper)?
      }
    };

    routes.get(path).map(|handler| (handler, HashMap::new()))
  }
}

// Placeholder types that need to be imported from request/response
use crate::request::JsRequest;
use crate::response::JsResponse;
