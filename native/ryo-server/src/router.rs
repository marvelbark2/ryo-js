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

  pub fn build(&self) -> Result<axum::Router> {
    let mut router = axum::Router::new();

    // Sort patterns - catch-all last
    let mut patterns: Vec<_> = self.routes.keys().cloned().collect();
    patterns.sort_by_key(|pattern| {
      if pattern == "/*" || pattern.starts_with("/*") {
        2 // Catch-all last
      } else if pattern.contains(':') {
        1 // Parameterized routes middle
      } else {
        0 // Static routes first
      }
    });

    for pattern in patterns {
      let methods = &self.routes[&pattern];

      // Transform pattern syntax
      let axum_pattern = if pattern.starts_with(':') {
        format!("/{{{}}}", &pattern[1..])
      } else if pattern == "/*" {
        "/*path".to_string()
      } else {
        pattern.clone()
      };

      // Build MethodRouter for this pattern
      let mut method_router = axum::routing::MethodRouter::new();

      for (method, handler) in methods {
        let h = handler.clone();
        let route_handler = move |req: axum::extract::Request| {
          let h = h.clone();
          async move {
            h.call(req, HashMap::new()).await.unwrap_or_else(|e| {
              axum::response::Response::builder()
                .status(500)
                .body(axum::body::Body::from(format!(
                  "Internal Server Error: {}",
                  e
                )))
                .unwrap()
            })
          }
        };
        println!("Registered route: {} {}", method, axum_pattern);

        method_router = match method.as_str() {
          "GET" => method_router.get(route_handler),
          "POST" => method_router.post(route_handler),
          "PUT" => method_router.put(route_handler),
          "DELETE" => method_router.delete(route_handler),
          "PATCH" => method_router.patch(route_handler),
          "OPTIONS" => method_router.options(route_handler),
          "HEAD" => method_router.head(route_handler),
          _ => method_router,
        };
      }

      router = router.route(&axum_pattern, method_router);
    }

    Ok(router)
  }
}

// Placeholder types that need to be imported from request/response
use crate::request::JsRequest;
use crate::response::JsResponse;
