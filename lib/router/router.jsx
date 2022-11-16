import { useState, useEffect } from 'react';

export default function Router() {
   const [state, setState] = useState({
      path: undefined,
      params: {},
      isLoading: true,
      push: (path) => { }
   });
   useEffect(() => {
      if (document) {
         const params = window.fetchParams();
         setState((p) => ({
            ...p, params, isLoading: false,
            push: (path) => {
               window.framework.ROUTER.go(path)
               setState((p) => ({ ...p, path, params: window.fetchParams() }));
            },
            back: () => {
               window.framework.ROUTER.back()
               setState((p) => ({ ...p, path: window.location.pathname, params: window.fetchParams() }));
            }
         }));
      }
   }, []);
   return state;
}