#![forbid(unsafe_code)]

use std::sync::Arc;

use axum::{
    Router as AxumRouter,
    extract::Request,
    response::{IntoResponse, Response},
};
use tokio::net::TcpListener;

pub mod dispatch;
pub mod router;
pub mod static_files;

use dispatch::JsDispatcher;
use router::Router;

#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

pub struct Server<D: JsDispatcher> {
    router: Arc<Router>,
    static_dir: Option<Arc<str>>,
    dispatcher: Arc<D>,
}

impl<D: JsDispatcher> Server<D> {
    pub fn new(router: Router, static_dir: Option<Arc<str>>, dispatcher: Arc<D>) -> Self {
        Self {
            router: Arc::new(router),
            static_dir,
            dispatcher,
        }
    }

    pub async fn listen(self, port: u16) {
        let router = self.router.clone();
        let static_dir = self.static_dir.clone();
        let dispatcher = self.dispatcher.clone();

        let app = AxumRouter::new().fallback(move |req: Request| {
            handle_request(req, router.clone(), static_dir.clone(), dispatcher.clone())
        });

        let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
        let listener = TcpListener::bind(addr)
            .await
            .expect("failed to bind TCP listener");

        axum::serve(listener, app)
            .await
            .expect("axum server crashed");
    }
}

#[inline(always)]
async fn handle_request<D: JsDispatcher>(
    req: Request,
    router: Arc<Router>,
    static_dir: Option<Arc<str>>,
    dispatcher: Arc<D>,
) -> Response {
    let method = req.method().clone();
    let path = req.uri().path().to_owned();

    // Static files
    if let Some(dir) = static_dir.as_deref() {
        if let Some(resp) = static_files::try_serve(dir, &path).await {
            return resp;
        }
    }

    // Route match
    if let Some(route) = router.match_route(method.as_str(), &path) {
        return dispatcher.dispatch(req, route).await;
    }

    not_found()
}

#[inline(always)]
fn not_found() -> Response {
    (axum::http::StatusCode::NOT_FOUND, "Not Found").into_response()
}
