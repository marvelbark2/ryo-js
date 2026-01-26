use axum::{
    extract::Request,
    http::StatusCode,
    response::{IntoResponse, Response},
};

use ryo_core::{Server, dispatch::JsDispatcher, router::Router};

struct TestDispatcher;

impl JsDispatcher for TestDispatcher {
    fn dispatch(
        &self,
        _req: Request,
        handler_id: u32,
        _params: Option<Vec<(String, String)>>,
    ) -> impl std::future::Future<Output = Response> + Send {
        async move {
            match handler_id {
                1 => (StatusCode::OK, "pong").into_response(),
                _ => (StatusCode::NOT_FOUND, "Not Found").into_response(),
            }
        }
    }
}

#[tokio::main(flavor = "multi_thread")]
async fn main() {
    let mut router = Router::new();

    // Normal route registration using your reverted API
    router.add_route("GET", "/ping", 1);

    let dispatcher = TestDispatcher;

    // If your Server::new signature differs, adjust this line only.
    // Common signature you had earlier: Server::new(router, static_dir, dispatcher)
    let server = Server::new(router, None, dispatcher);

    let port = 3000;
    println!("ryo-core test server (no JS) listening on http://127.0.0.1:{port}");
    server.listen(port).await;
}
