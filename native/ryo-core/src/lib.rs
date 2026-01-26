#![forbid(unsafe_code)]

use std::sync::Arc;

use axum::{
    Router as AxumRouter,
    extract::{Request, State},
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

struct AppState<D: JsDispatcher> {
    router: Router,
    static_dir: Option<Box<str>>,
    dispatcher: D,
}

pub struct Server<D: JsDispatcher> {
    state: Arc<AppState<D>>,
}

impl<D: JsDispatcher> Server<D> {
    pub fn new(router: Router, static_dir: Option<Box<str>>, dispatcher: D) -> Self {
        Self {
            state: Arc::new(AppState {
                router,
                static_dir,
                dispatcher,
            }),
        }
    }

    pub async fn listen(self, port: u16) {
        let app = AxumRouter::new()
            .fallback(|state: State<Arc<AppState<D>>>, req: Request| async move {
                handle_request::<D>(state, req).await
            })
            .with_state(self.state);

        let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
        let listener = TcpListener::bind(addr)
            .await
            .expect("failed to bind TCP listener");

        axum::serve(listener, app)
            .await
            .expect("axum server crashed");
    }
}

async fn handle_request<D: JsDispatcher>(
    State(state): State<Arc<AppState<D>>>,
    req: Request,
) -> Response {
    let uri = req.uri().clone();
    let path = uri.path(); // &str, no alloc
    let method = req.method().as_str();

    if let Some(dir) = state.static_dir.as_deref() {
        if let Some(resp) = static_files::try_serve(dir, path).await {
            return resp;
        }
    }

    if let Some(route) = state.router.match_route(method, path) {
        let handler_id = route.handler_id;

        let params = if route.params.is_empty() {
            None
        } else {
            let mut p = Vec::new();
            for (k, v) in route.params.iter() {
                p.push((k.to_string(), v.to_string()));
            }
            Some(p)
        };
        return state.dispatcher.dispatch(req, handler_id, params).await;
    }

    not_found()
}

fn not_found() -> Response {
    (axum::http::StatusCode::NOT_FOUND, "Not Found").into_response()
}
