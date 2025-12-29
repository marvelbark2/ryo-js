use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::sync::{Arc, RwLock};

mod request;
mod response;
mod router;
mod static_files;

use router::{RouteHandler, Router};

use crate::{request::JsRequest, response::JsResponse};

/// The main server class exposed to JavaScript
#[napi]
pub struct RyoServer {
  router: Arc<RwLock<Router>>,
  static_dir: Option<Arc<str>>,
  port: u16,
}

#[napi]
impl RyoServer {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {
      router: Arc::new(RwLock::new(Router::new())),
      static_dir: None,
      port: 3000,
    }
  }

  /// Set the directory for static file serving
  #[napi]
  pub fn set_static_dir(&mut self, dir: String) {
    self.static_dir = Some(Arc::<str>::from(dir));
  }

  /// Register a GET route handler
  #[napi]
  pub fn get(
    &self,
    pattern: String,
    handler: Function<FnArgs<(JsResponse, JsRequest)>, ()>,
  ) -> Result<()> {
    let handler = RouteHandler::new(handler)?;
    self
      .router
      .write()
      .unwrap()
      .add_route("GET", &pattern, handler);
    Ok(())
  }

  /// Register a POST route handler
  #[napi]
  pub fn post(
    &self,
    pattern: String,
    handler: Function<FnArgs<(JsResponse, JsRequest)>, ()>,
  ) -> Result<()> {
    let handler = RouteHandler::new(handler)?;
    self
      .router
      .write()
      .unwrap()
      .add_route("POST", &pattern, handler);
    Ok(())
  }

  /// Register a handler for any HTTP method
  #[napi]
  pub fn any(
    &self,
    pattern: String,
    handler: Function<FnArgs<(JsResponse, JsRequest)>, ()>,
  ) -> Result<()> {
    let handler = RouteHandler::new(handler)?;
    let mut router = self.router.write().unwrap();
    for method in ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"] {
      router.add_route(method, &pattern, handler.clone());
    }
    Ok(())
  }

  /// Start the server
  #[napi]
  pub async unsafe fn listen(&mut self, port: u16) -> Result<()> {
    self.port = port;

    let router = self.router.clone();
    let static_dir = self.static_dir.clone();

    let rt = tokio::runtime::Builder::new_multi_thread()
      .worker_threads(num_cpus::get())
      .enable_all()
      .build()
      .map_err(|e| Error::from_reason(format!("Failed to create runtime: {}", e)))?;

    rt.spawn(async move {
      // let app = axum::Router::new().fallback(move |req: axum::extract::Request| async move {
      //   handle_request(req, router.clone(), static_dir.clone()).await
      // });

      let axum_router = router.write().unwrap().build().unwrap();

      let app: axum::Router = axum_router.fallback(move |req: axum::extract::Request| async move {
        handle_request(req, router.clone(), static_dir.clone()).await
      });

      let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
      let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

      println!("Rust server listening on http://0.0.0.0:{}", port);

      axum::serve(listener, app).await.unwrap();
    });

    // Keep the runtime alive
    std::mem::forget(rt);
    Ok(())
  }
}

async fn handle_request(
  req: axum::extract::Request,
  router: Arc<RwLock<Router>>,
  static_dir: Option<Arc<str>>,
) -> axum::response::Response {
  let method = req.method().as_str();
  let path = req.uri().path();

  // First, try to serve static files (if configured)
  if let Some(ref dir) = static_dir {
    if let Some(response) = static_files::try_serve(dir.as_ref(), path).await {
      return response;
    }
  }

  // Look up the route in our router
  let handler_and_params = {
    let router_guard = router.read().unwrap();
    router_guard
      .match_route(method, path)
      .map(|(h, p)| (h.clone(), p))
  };

  if let Some((handler, params)) = handler_and_params {
    // Call back into JavaScript
    match handler.call(req, params).await {
      Ok(response) => response,
      Err(e) => {
        eprintln!("Handler error: {}", e);
        axum::response::Response::builder()
          .status(500)
          .body(axum::body::Body::from("Internal Server Error"))
          .unwrap()
      }
    }
  } else {
    // No route found
    axum::response::Response::builder()
      .status(404)
      .body(axum::body::Body::from("Not Found"))
      .unwrap()
  }
}
