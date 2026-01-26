use axum::{extract::Request, response::Response};
use std::future::Future;

pub trait JsDispatcher: Send + Sync + 'static {
    fn dispatch(
        &self,
        req: Request,
        handler_id: u32,
        params: Option<Vec<(String, String)>>,
    ) -> impl Future<Output = Response> + Send;
}
