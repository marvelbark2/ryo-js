use napi::bindgen_prelude::*;
use napi_derive::napi;

use once_cell::sync::OnceCell;
use std::sync::Arc;

use tokio::runtime::Runtime;

use ryo_core::{Server, router::Router};

mod dispatcher;
mod registry;
mod request;
mod response;

use dispatcher::NapiDispatcher;
use registry::HandlerRegistry;

/// Single Tokio runtime for the whole process
static RUNTIME: OnceCell<Runtime> = OnceCell::new();

fn runtime() -> &'static Runtime {
  RUNTIME.get_or_init(|| {
    tokio::runtime::Builder::new_multi_thread()
      .worker_threads(num_cpus::get() / 2)
      .enable_all()
      .build()
      .expect("failed to create Tokio runtime")
  })
}

#[napi]
pub struct RyoServer {
  router: Router,
  registry: Arc<HandlerRegistry>,
  static_dir: Option<Arc<str>>,
}

#[napi]
impl RyoServer {
  #[napi(constructor)]
  pub fn new() -> Self {
    Self {
      router: Router::new(),
      registry: Arc::new(HandlerRegistry::new()),
      static_dir: None,
    }
  }

  #[napi]
  pub fn set_static_dir(&mut self, dir: String) {
    self.static_dir = Some(Arc::<str>::from(dir));
  }

  #[napi]
  pub fn get(
    &mut self,
    path: String,
    handler: Function<FnArgs<(response::JsResponse, request::JsRequest)>, ()>,
  ) -> Result<()> {
    self.add_route("GET", path, handler)
  }

  #[napi]
  pub fn post(
    &mut self,
    path: String,
    handler: Function<FnArgs<(response::JsResponse, request::JsRequest)>, ()>,
  ) -> Result<()> {
    self.add_route("POST", path, handler)
  }

  fn add_route(
    &mut self,
    method: &str,
    path: String,
    handler: Function<FnArgs<(response::JsResponse, request::JsRequest)>, ()>,
  ) -> Result<()> {
    let tsfn = handler
      .build_threadsafe_function()
      .callee_handled::<true>()
      .build()?;

    let id = Arc::get_mut(&mut self.registry)
      .expect("cannot add routes after server start")
      .register(tsfn);

    self.router.add_route(method, &path, id);
    Ok(())
  }

  /// Start the HTTP server
  #[napi]
  pub fn listen(&mut self, port: u16, callback: Option<Function<(String,), ()>>) -> Result<()> {
    let dispatcher = Arc::new(NapiDispatcher::new(self.registry.clone()));

    let server = Server::new(self.router.clone(), self.static_dir.clone(), dispatcher);

    runtime().spawn(async move {
      server.listen(port).await;
    });

    if let Some(cb) = callback {
      cb.call((format!("localhost:{}", port),))?;
    }

    Ok(())
  }
}
