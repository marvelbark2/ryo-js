use axum::extract::Request;
use axum::response::Response;

use crate::router::RouteMatch;

pub trait JsDispatcher: Send + Sync + 'static {
  fn dispatch(
    &self,
    req: Request,
    route: RouteMatch<'_>,
  ) -> futures::future::BoxFuture<'static, Response>;
}
