use matchit::Router as MatchRouter;

pub type HandlerId = u32;

#[derive(Debug)]
pub struct RouteMatch<'a> {
    pub handler_id: HandlerId,
    pub params: matchit::Params<'a, 'a>,
}

#[derive(Debug, Clone)]
pub struct Router {
    get: MatchRouter<HandlerId>,
    post: MatchRouter<HandlerId>,
    put: MatchRouter<HandlerId>,
    delete: MatchRouter<HandlerId>,
    patch: MatchRouter<HandlerId>,
    options: MatchRouter<HandlerId>,
    head: MatchRouter<HandlerId>,
}

impl Router {
    #[inline]
    pub fn new() -> Self {
        Self {
            get: MatchRouter::new(),
            post: MatchRouter::new(),
            put: MatchRouter::new(),
            delete: MatchRouter::new(),
            patch: MatchRouter::new(),
            options: MatchRouter::new(),
            head: MatchRouter::new(),
        }
    }

    #[inline]
    pub fn add_route(&mut self, method: &str, path: &str, handler_id: HandlerId) {
        println!("Adding route: (method={}) (path={})", method, path);

        let router = match method {
            "GET" => &mut self.get,
            "POST" => &mut self.post,
            "PUT" => &mut self.put,
            "DELETE" => &mut self.delete,
            "PATCH" => &mut self.patch,
            "OPTIONS" => &mut self.options,
            "HEAD" => &mut self.head,
            _ => panic!("unsupported HTTP method: {method}"),
        };

        if let Err(err) = router.insert(path, handler_id) {
            if matches!(err, matchit::InsertError::Conflict { .. }) {
                return;
            }

            // other errors are real bugs
            panic!("failed to insert route {} {}: {:?}", method, path, err);
        }
    }

    #[inline(always)]
    pub fn match_route<'a>(&'a self, method: &str, path: &'a str) -> Option<RouteMatch<'a>> {
        let result = match method {
            "GET" => self.get.at(path),
            "POST" => self.post.at(path),
            "PUT" => self.put.at(path),
            "DELETE" => self.delete.at(path),
            "PATCH" => self.patch.at(path),
            "OPTIONS" => self.options.at(path),
            "HEAD" => self.head.at(path),
            _ => return None,
        };

        match result {
            Ok(matched) => Some(RouteMatch {
                handler_id: *matched.value,
                params: matched.params,
            }),
            Err(_) => None,
        }
    }
}
