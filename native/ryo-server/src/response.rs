use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;
use std::cell::RefCell;
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::mpsc;

/// Buffered operations during cork
#[derive(Default)]
struct CorkBuffer {
  status: Option<u16>,
  headers: Vec<(String, String)>,
  body_chunks: Vec<Vec<u8>>,
  should_end: bool,
  end_data: Option<Vec<u8>>,
  total_size: u32,
  write_offset: u32,
}

/// JavaScript-facing response object
#[napi]
pub struct JsResponse {
  status: u16,
  headers: HashMap<String, String>,
  body_sender: Option<mpsc::Sender<Vec<u8>>>,
  completed: bool,
  corked: RefCell<bool>,
  cork_buffer: RefCell<CorkBuffer>,
  abort_callbacks: RefCell<Vec<Arc<ThreadsafeFunction<(), ()>>>>,
  aborted: RefCell<bool>,
  write_offset: RefCell<u32>,
  on_data_callbacks: RefCell<Vec<Arc<ThreadsafeFunction<(Buffer, bool), ()>>>>,
}

#[napi]
impl JsResponse {
  pub fn new(sender: mpsc::Sender<Vec<u8>>) -> Self {
    Self {
      status: 200,
      headers: HashMap::new(),
      body_sender: Some(sender),
      completed: false,
      corked: RefCell::new(false),
      cork_buffer: RefCell::new(CorkBuffer::default()),
      abort_callbacks: RefCell::new(Vec::new()),
      aborted: RefCell::new(false),
      write_offset: RefCell::new(0),
      on_data_callbacks: RefCell::new(Vec::new()),
    }
  }

  /// Check if currently in corked state
  fn is_corked(&self) -> bool {
    *self.corked.borrow()
  }

  /// Trigger all abort callbacks
  fn trigger_abort_callbacks(&self) {
    for callback in self.abort_callbacks.borrow().iter() {
      callback.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
    }
  }

  /// Mark response as aborted and trigger callbacks
  fn abort(&self) {
    *self.aborted.borrow_mut() = true;
    self.trigger_abort_callbacks();
  }

  /// Flush all buffered operations
  fn flush_cork_buffer(&mut self) {
    let buffer = std::mem::take(&mut *self.cork_buffer.borrow_mut());

    // Apply buffered status
    if let Some(status) = buffer.status {
      self.status = status;
    }

    // Apply buffered headers
    for (key, value) in buffer.headers {
      self.headers.insert(key, value);
    }

    // Send all buffered body chunks in one batch
    if let Some(ref sender) = self.body_sender {
      // Combine all chunks into one for efficiency
      if !buffer.body_chunks.is_empty() {
        let total_size: usize = buffer.body_chunks.iter().map(|c| c.len()).sum();
        let mut combined = Vec::with_capacity(total_size);
        for chunk in buffer.body_chunks {
          combined.extend(chunk);
        }
        let _ = sender.try_send(combined);
      }
    }

    // Handle end if requested
    if buffer.should_end && !self.completed {
      if let Some(ref sender) = self.body_sender {
        if let Some(end_data) = buffer.end_data {
          let _ = sender.try_send(end_data);
        }
      }
      self.body_sender = None;
      self.completed = true;
    }
  }

  #[napi]
  pub fn write_status(&mut self, status: String) -> &Self {
    let code = status
      .split_whitespace()
      .next()
      .and_then(|s| s.parse().ok())
      .unwrap_or(200);

    if self.is_corked() {
      self.cork_buffer.borrow_mut().status = Some(code);
    } else {
      self.status = code;
    }
    self
  }

  #[napi]
  pub fn write_header(&mut self, key: String, value: String) -> &Self {
    if self.is_corked() {
      self.cork_buffer.borrow_mut().headers.push((key, value));
    } else {
      self.headers.insert(key, value);
    }
    self
  }

  #[napi]
  pub fn on_aborted(&mut self, callback: Function<(), ()>) -> Result<()> {
    // Convert to ThreadsafeFunction for safe callback across threads
    let tsfn: Arc<ThreadsafeFunction<(), ()>> = Arc::new(
      callback
        .build_threadsafe_function()
        .callee_handled::<true>()
        .build()?,
    );

    // If already aborted, call immediately
    if *self.aborted.borrow() {
      tsfn.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
    } else {
      // Otherwise, register for future abort
      self.abort_callbacks.borrow_mut().push(tsfn);
    }

    Ok(())
  }

  #[napi]
  pub fn write(&mut self, data: Either<String, Buffer>) -> bool {
    let bytes = match data {
      Either::A(s) => s.into_bytes(),
      Either::B(b) => b.into(),
    };

    let len = bytes.len() as u32;

    if self.is_corked() {
      let mut buffer = self.cork_buffer.borrow_mut();
      buffer.body_chunks.push(bytes);
      buffer.write_offset += len;
      true
    } else if let Some(ref sender) = self.body_sender {
      let success = sender.try_send(bytes).is_ok();
      if success {
        *self.write_offset.borrow_mut() += len;
      }
      success
    } else {
      false
    }
  }

  #[napi]
  pub fn end(&mut self, data: Option<Either<String, Buffer>>) {
    if self.completed {
      return;
    }

    let end_bytes = data.map(|d| match d {
      Either::A(s) => s.into_bytes(),
      Either::B(b) => b.into(),
    });

    self.abort();
    if self.is_corked() {
      let mut buffer = self.cork_buffer.borrow_mut();
      buffer.should_end = true;
      buffer.end_data = end_bytes;
    } else {
      if let Some(ref sender) = self.body_sender {
        if let Some(bytes) = end_bytes {
          let _ = sender.try_send(bytes);
        }
      }
      self.body_sender = None;
      self.completed = true;
    }
  }

  #[napi]
  pub fn cork(&mut self, callback: Function<(), ()>) -> Result<()> {
    // Enter corked state
    *self.corked.borrow_mut() = true;

    // Execute callback - all writes will be buffered
    let result = callback.call(());

    // Exit corked state
    *self.corked.borrow_mut() = false;

    // Flush all buffered operations in one batch
    self.flush_cork_buffer();

    result
  }

  #[napi]
  pub fn try_end(&mut self, data: Buffer, total_size: u32) -> bool {
    // If the stream is already completed, no further action is allowed.
    if self.completed {
      return false;
    }

    // Convert Buffer into Vec<u8>
    let bytes: Vec<u8> = data.into();
    let len = bytes.len() as u32;

    // If the stream is corked, store data until uncork happens later
    if self.is_corked() {
      let mut buffer = self.cork_buffer.borrow_mut();
      buffer.body_chunks.push(bytes);
      buffer.should_end = true;
      buffer.total_size = total_size;
      buffer.write_offset += len;
      self.completed = true;
      return true;
    }

    // If we have an active sender, try sending the final chunk
    if let Some(ref sender) = self.body_sender {
      let send_result = sender.try_send(bytes).is_ok();

      if send_result {
        *self.write_offset.borrow_mut() += len;
        self.body_sender = None;
        self.completed = true;
      }

      return send_result;
    }

    // If neither corking nor sender exists, we can't finalize
    false
  }

  #[napi]
  pub fn get_write_offset(&self) -> u32 {
    if self.is_corked() {
      self.cork_buffer.borrow().write_offset
    } else {
      *self.write_offset.borrow()
    }
  }

  #[napi]
  pub fn on_data(&mut self, callback: Function<(Buffer, bool), ()>) -> Result<()> {
    let tsfn: Arc<ThreadsafeFunction<(Buffer, bool), ()>> = Arc::new(
      callback
        .build_threadsafe_function()
        .callee_handled::<true>()
        .build()?,
    );
    self.on_data_callbacks.borrow_mut().push(tsfn);
    Ok(())
  }

  #[napi]
  pub fn is_aborted(&self) -> bool {
    self.body_sender.is_none()
  }

  #[napi(getter)]
  pub fn aborted(&self) -> bool {
    self.completed || self.body_sender.is_none()
  }

  #[napi(setter)]
  pub fn set_aborted(&mut self, value: bool) {
    if value {
      self.body_sender = None;
      self.completed = true;
    }
  }
}
