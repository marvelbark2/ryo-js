use std::sync::Arc;

use napi::bindgen_prelude::*;
use napi::threadsafe_function::ThreadsafeFunction;

pub struct JsHandler {
  pub tsfn:
    Arc<ThreadsafeFunction<FnArgs<(crate::response::JsResponse, crate::request::JsRequest)>, ()>>,
}

pub struct HandlerRegistry {
  handlers: Vec<JsHandler>,
}

impl HandlerRegistry {
  pub fn new() -> Self {
    Self {
      handlers: Vec::new(),
    }
  }

  pub fn register(
    &mut self,
    tsfn: ThreadsafeFunction<FnArgs<(crate::response::JsResponse, crate::request::JsRequest)>, ()>,
  ) -> u32 {
    let id = self.handlers.len() as u32;
    self.handlers.push(JsHandler {
      tsfn: Arc::new(tsfn),
    });
    id
  }

  #[inline(always)]
  pub fn get(&self, id: u32) -> &JsHandler {
    &self.handlers[id as usize]
  }
}
