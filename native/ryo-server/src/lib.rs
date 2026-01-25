use napi::bindgen_prelude::*;
use napi_derive::napi;

use std::sync::Arc;

mod request;
mod response;
mod router;
mod static_files;

use router::{RouteHandler, Router};
use crate::{request::JsRequest, response::JsResponse};


#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;
/// The main server class exposed to JavaScript
#[napi]
pub struct RyoServer {
  router: Router,                 // mutable only during setup
  static_dir: Option<Arc<str>>
}

#[napi]
impl RyoServer {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {
      router: Router::new(),
      static_dir: None,
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
    &mut self,
    pattern: String,
    handler: Function<FnArgs<(JsResponse, JsRequest)>, ()>,
  ) -> Result<()> {
    let handler = RouteHandler::new(handler)?;
    self.router.add_route("GET", &pattern, handler);
    Ok(())
  }

  /// Register a POST route handler
  #[napi]
  pub fn post(
    &mut self,
    pattern: String,
    handler: Function<FnArgs<(JsResponse, JsRequest)>, ()>,
  ) -> Result<()> {
    let handler = RouteHandler::new(handler)?;
    self.router.add_route("POST", &pattern, handler);
    Ok(())
  }

  /// Register a handler for any HTTP method
  #[napi]
  pub fn any(
    &mut self,
    pattern: String,
    handler: Function<FnArgs<(JsResponse, JsRequest)>, ()>,
  ) -> Result<()> {
    let handler = RouteHandler::new(handler)?;
    for method in ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS", "HEAD"] {
      self.router.add_route(method, &pattern, handler.clone());
    }
    Ok(())
  }

  /// Start the server
  #[napi]
  pub fn listen(&mut self, port: u16) -> Result<()> {
    let router = Arc::new(self.router.clone());
    let static_dir = self.static_dir.clone();

    let rt = tokio::runtime::Builder::new_multi_thread()
      // fewer threads = better tail latency
      .worker_threads(num_cpus::get() / 2)
      .enable_all()
      .build()
      .map_err(|e| Error::from_reason(format!("Failed to create runtime: {e}")))?;

    rt.spawn(async move {
      let app = axum::Router::new().fallback(move |req| {
        handle_request(req, router.clone(), static_dir.clone())
      });

      let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
      let listener = tokio::net::TcpListener::bind(addr).await.unwrap();

      println!("[V2] Rust server listening on http://0.0.0.0:{port}");

      axum::serve(listener, app).await.unwrap();
    });

    // Keep runtime alive for Node.js lifetime
    std::mem::forget(rt);
    Ok(())
  }
}

async fn handle_request(
  req: axum::extract::Request,
  router: Arc<Router>,
  static_dir: Option<Arc<str>>,
) -> axum::response::Response {
  let method = req.method().as_str();
  let path = req.uri().path();

  // Static files first (cheap early-exit)
  if let Some(dir) = static_dir.as_deref() {
    if let Some(response) = static_files::try_serve(dir, path).await {
      return response;
    }
  }

  // Lock-free route lookup
  if let Some((handler, params)) = router.match_route(method, path) {
    match handler.call(req, params).await {
      Ok(response) => response,
      Err(err) => {
        eprintln!("Handler error: {err}");
        axum::response::Response::builder()
          .status(500)
          .body(axum::body::Body::from("Internal Server Error"))
          .unwrap()
      }
    }
  } else {
    axum::response::Response::builder()
      .status(404)
      .body(axum::body::Body::from("Not Found"))
      .unwrap()
  }
}
