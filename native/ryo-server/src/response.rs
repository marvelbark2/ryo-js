use std::sync::{
  Arc, Mutex,
  atomic::{AtomicBool, AtomicU16, AtomicU32, Ordering},
};

use napi::bindgen_prelude::*;
use napi::threadsafe_function::{ThreadsafeFunction, ThreadsafeFunctionCallMode};
use napi_derive::napi;

use tokio::sync::oneshot;

/// What we send back to Rust dispatcher once JS ends the response.
#[derive(Debug)]
pub struct ResponseParts {
  pub status: u16,
  pub headers: Vec<(String, String)>,
  pub body: Vec<u8>,
}

struct Inner {
  status: AtomicU16,
  aborted: AtomicBool,
  ended: AtomicBool,

  headers: Mutex<Vec<(String, String)>>,
  body: Mutex<Vec<u8>>,

  done_tx: Mutex<Option<oneshot::Sender<ResponseParts>>>,

  on_aborted: Mutex<Option<Arc<ThreadsafeFunction<(), ()>>>>,
  on_data: Mutex<Option<Arc<ThreadsafeFunction<(Buffer, bool), ()>>>>,
  on_writable: Mutex<Option<Arc<ThreadsafeFunction<(u32,), bool>>>>,

  write_offset: AtomicU32,

  // optional buffered request body (if you wire feeding)
  req_body: Mutex<Vec<u8>>,
}

impl Inner {
  fn new(tx: oneshot::Sender<ResponseParts>) -> Self {
    Self {
      status: AtomicU16::new(200),
      aborted: AtomicBool::new(false),
      ended: AtomicBool::new(false),
      headers: Mutex::new(Vec::new()),
      body: Mutex::new(Vec::new()),
      done_tx: Mutex::new(Some(tx)),
      on_aborted: Mutex::new(None),
      on_data: Mutex::new(None),
      on_writable: Mutex::new(None),
      write_offset: AtomicU32::new(0),
      req_body: Mutex::new(Vec::new()),
    }
  }
}

#[napi]
#[derive(Clone)]
pub struct JsResponse {
  inner: Arc<Inner>,
}

impl JsResponse {
  pub fn new_oneshot() -> (Self, oneshot::Receiver<ResponseParts>) {
    let (tx, rx) = oneshot::channel();
    (
      Self {
        inner: Arc::new(Inner::new(tx)),
      },
      rx,
    )
  }

  /// Internal: mark aborted + fire callback if set.
  pub fn abort(&self) {
    if !self.inner.aborted.swap(true, Ordering::SeqCst) {
      if let Some(cb) = self.inner.on_aborted.lock().unwrap().as_ref() {
        cb.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
      }
    }
  }

  /// Internal: feed request body chunks to onData and buffer for readJson.
  pub fn feed_request_data(&self, chunk: &[u8], is_last: bool) {
    {
      let mut buf = self.inner.req_body.lock().unwrap();
      buf.extend_from_slice(chunk);
    }

    if let Some(cb) = self.inner.on_data.lock().unwrap().as_ref() {
      cb.call(
        Ok((Buffer::from(chunk.to_vec()), is_last)),
        ThreadsafeFunctionCallMode::NonBlocking,
      );
    }
  }

  fn append_body_bytes(&self, bytes: &[u8]) {
    let mut body = self.inner.body.lock().unwrap();
    body.extend_from_slice(bytes);
    self
      .inner
      .write_offset
      .fetch_add(bytes.len() as u32, Ordering::Relaxed);
  }

  fn finish_if_needed(&self) {
    if self.inner.ended.swap(true, Ordering::SeqCst) {
      return;
    }

    let status = self.inner.status.load(Ordering::Relaxed);
    let headers = std::mem::take(&mut *self.inner.headers.lock().unwrap());
    let body = std::mem::take(&mut *self.inner.body.lock().unwrap());

    if let Some(tx) = self.inner.done_tx.lock().unwrap().take() {
      let _ = tx.send(ResponseParts {
        status,
        headers,
        body,
      });
    }
  }
}

#[napi]
impl JsResponse {
  // writeStatus(status: string): this;
  #[napi]
  pub fn write_status(&self, status: String) -> Self {
    let code = status
      .split_whitespace()
      .next()
      .and_then(|s| s.parse::<u16>().ok())
      .unwrap_or(200);

    self.inner.status.store(code, Ordering::Relaxed);
    self.clone()
  }

  // writeHeader(key: string, value: string): this;
  #[napi]
  pub fn write_header(&self, key: String, value: String) -> Self {
    self.inner.headers.lock().unwrap().push((key, value));
    self.clone()
  }

  // write(chunk: string | ArrayBuffer): boolean;
  #[napi]
  pub fn write(&self, chunk: Either<String, Buffer>) -> bool {
    if self.inner.aborted.load(Ordering::Relaxed) || self.inner.ended.load(Ordering::Relaxed) {
      return false;
    }

    match chunk {
      Either::A(s) => self.append_body_bytes(s.as_bytes()),
      Either::B(buf) => self.append_body_bytes(&buf),
    }
    true
  }

  // end(body?: string | ArrayBuffer): void;
  #[napi]
  pub fn end(&self, body: Option<Either<String, Buffer>>) {
    if self.inner.aborted.load(Ordering::Relaxed) {
      return;
    }

    if !self.inner.ended.swap(true, Ordering::SeqCst) {
      let status = self.inner.status.load(Ordering::Relaxed);
      let headers = std::mem::take(&mut *self.inner.headers.lock().unwrap());

      let mut out: Vec<u8> = Vec::new();
      if let Some(b) = body {
        match b {
          Either::A(s) => out.extend_from_slice(s.as_bytes()),
          Either::B(buf) => out.extend_from_slice(&buf),
        }
        self
          .inner
          .write_offset
          .store(out.len() as u32, Ordering::Relaxed);
      }

      if let Some(tx) = self.inner.done_tx.lock().unwrap().take() {
        let _ = tx.send(ResponseParts {
          status,
          headers,
          body: out,
        });
      }

      return;
    }

    // If already ended, ignore
  }

  // cork(callback: () => void): void;
  #[napi]
  pub fn cork(&self, callback: Function<(), ()>) -> Result<()> {
    callback.call(())?;
    Ok(())
  }

  // isAborted(): boolean;
  #[napi]
  pub fn is_aborted(&self) -> bool {
    self.inner.aborted.load(Ordering::Relaxed)
  }

  // onAborted(callback: () => void): void;
  #[napi]
  pub fn on_aborted(&self, callback: Function<(), ()>) -> Result<()> {
    let tsfn = callback
      .build_threadsafe_function()
      .callee_handled::<true>()
      .build()?;

    *self.inner.on_aborted.lock().unwrap() = Some(Arc::new(tsfn));

    if self.inner.aborted.load(Ordering::Relaxed) {
      if let Some(cb) = self.inner.on_aborted.lock().unwrap().as_ref() {
        cb.call(Ok(()), ThreadsafeFunctionCallMode::NonBlocking);
      }
    }

    Ok(())
  }

  // onData(callback: (chunk: ArrayBuffer, isLast: boolean) => void): void;
  #[napi]
  pub fn on_data(&self, callback: Function<(Buffer, bool), ()>) -> Result<()> {
    let tsfn = callback
      .build_threadsafe_function()
      .callee_handled::<true>()
      .build()?;

    *self.inner.on_data.lock().unwrap() = Some(Arc::new(tsfn));
    Ok(())
  }

  // getWriteOffset(): number;
  #[napi]
  pub fn get_write_offset(&self) -> u32 {
    self.inner.write_offset.load(Ordering::Relaxed)
  }

  // tryEnd(data: ArrayBuffer | SharedArrayBuffer, totalSize: number): [boolean, boolean];
  #[napi]
  pub fn try_end(&self, data: Buffer, total_size: u32) -> (bool, bool) {
    if self.inner.aborted.load(Ordering::Relaxed) || self.inner.ended.load(Ordering::Relaxed) {
      return (false, true);
    }

    self.append_body_bytes(&data);

    let current = self.inner.write_offset.load(Ordering::Relaxed);
    let done = current >= total_size;
    if done {
      self.finish_if_needed();
    }
    (true, done)
  }

  // onWritable(callback: (offset: number) => boolean): void;
  #[napi]
  pub fn on_writable(&self, callback: Function<(u32,), bool>) -> Result<()> {
    let tsfn = callback
      .build_threadsafe_function()
      .callee_handled::<true>()
      .build()?;

    *self.inner.on_writable.lock().unwrap() = Some(Arc::new(tsfn));
    Ok(())
  }

  // readJson(contextType: string, cb: any, err: any): void;
  #[napi]
  pub fn read_json(
    &self,
    _context_type: String,
    cb: Function<(String,), ()>,
    err: Function<(String,), ()>,
  ) -> Result<()> {
    let body = self.inner.req_body.lock().unwrap();
    if body.is_empty() {
      err.call((
        "readJson: no buffered request body yet (wire request body feeding)".to_string(),
      ))?;
      return Ok(());
    }

    let s = String::from_utf8_lossy(&body).to_string();
    cb.call((s,))?;
    Ok(())
  }
}
