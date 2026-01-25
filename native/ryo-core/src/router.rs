use matchit::Router as MatchRouter;

pub type HandlerId = u32;

#[derive(Debug)]
pub struct RouteMatch<'a> {
  pub handler_id: HandlerId,
  pub params: matchit::Params<'a,'a>,
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
    match method {
      "GET" => self.get.insert(path, handler_id).unwrap(),
      "POST" => self.post.insert(path, handler_id).unwrap(),
      "PUT" => self.put.insert(path, handler_id).unwrap(),
      "DELETE" => self.delete.insert(path, handler_id).unwrap(),
      "PATCH" => self.patch.insert(path, handler_id).unwrap(),
      "OPTIONS" => self.options.insert(path, handler_id).unwrap(),
      "HEAD" => self.head.insert(path, handler_id).unwrap(),
      _ => {
        panic!("unsupported HTTP method: {method}");
      }
    }
  }

  #[inline(always)]
  pub fn match_route<'a>(
    &'a self,
    method: &str,
    path: &'a str,
  ) -> Option<RouteMatch<'a>> {
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
