use napi::bindgen_prelude::*;
use napi_derive::napi;
use std::collections::HashMap;
use tokio::sync::mpsc;
/// JavaScript-facing response object
#[napi]
pub struct JsResponse {
  status: u16,
  headers: HashMap<String, String>,
  body_sender: Option<mpsc::Sender<Vec<u8>>>,
  completed: bool,
}

#[napi]
impl JsResponse {
  pub fn new(sender: mpsc::Sender<Vec<u8>>) -> Self {
    Self {
      status: 200,
      headers: HashMap::new(),
      body_sender: Some(sender),
      completed: false,
    }
  }

  #[napi]
  pub fn write_status(&mut self, status: String) -> &Self {
    // Parse "200 OK" or just "200"
    if let Some(code) = status.split_whitespace().next() {
      self.status = code.parse().unwrap_or(200);
    }
    self
  }

  #[napi]
  pub fn write_header(&mut self, key: String, value: String) -> &Self {
    self.headers.insert(key, value);
    self
  }

  #[napi]
  pub fn write(&mut self, data: Buffer) -> bool {
    if let Some(ref sender) = self.body_sender {
      sender.try_send(data.to_vec()).is_ok()
    } else {
      false
    }
  }

  #[napi]
  pub fn end(&mut self, data: Option<Either<String, Buffer>>) {
    if self.completed {
      return;
    }

    if let Some(ref sender) = self.body_sender {
      if let Some(body) = data {
        let bytes = match body {
          Either::A(s) => s.into_bytes(),
          Either::B(b) => b.to_vec(),
        };
        let _ = sender.try_send(bytes);
      }
    }

    self.body_sender = None;
    self.completed = true;
  }

  #[napi]
  pub fn cork(&self, callback: Function<()>) -> Result<()> {
    // Call the callback with no arguments
    callback.call(())?;
    Ok(())
  }
}
