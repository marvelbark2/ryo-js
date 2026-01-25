use std::sync::Arc;

use axum::{body::Body, extract::Request, http::StatusCode, response::Response};

use futures::future::BoxFuture;

use napi::bindgen_prelude::*;
use napi::threadsafe_function::ThreadsafeFunctionCallMode;

use ryo_core::dispatch::JsDispatcher;
use ryo_core::router::RouteMatch;

use crate::registry::HandlerRegistry;
use crate::request::JsRequest;
use crate::response::JsResponse;

pub struct NapiDispatcher {
  registry: Arc<HandlerRegistry>,
}

impl NapiDispatcher {
  pub fn new(registry: Arc<HandlerRegistry>) -> Self {
    Self { registry }
  }
}

impl JsDispatcher for NapiDispatcher {
  fn dispatch(&self, req: Request, route: RouteMatch<'_>) -> BoxFuture<'static, Response> {
    let handler = self.registry.get(route.handler_id);
    let tsfn = Arc::clone(&handler.tsfn);

    let mut params: Vec<(String, String)> = Vec::new();
    for (k, v) in route.params.iter() {
      params.push((k.to_string(), v.to_string()));
    }

    let (js_res, body_rx) = JsResponse::new_oneshot();
    let js_req = JsRequest::from_axum(&req, params);

    tsfn.call(
      Ok(FnArgs {
        data: (js_res, js_req),
      }),
      ThreadsafeFunctionCallMode::NonBlocking,
    );

    Box::pin(async move {
      match body_rx.await {
        Ok(parts) => {
          let mut builder = Response::builder().status(parts.status);
          for (k, v) in parts.headers {
            builder = builder.header(k, v);
          }
          builder.body(Body::from(parts.body)).unwrap()
        }
        Err(_) => Response::builder()
          .status(StatusCode::INTERNAL_SERVER_ERROR)
          .body(Body::from("Handler failed"))
          .unwrap(),
      }
    })
  }
}
