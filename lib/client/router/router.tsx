import { useState, useEffect } from 'preact/hooks';

export default function Router() {
   const [state, setState] = useState({
      path: undefined,
      params: {},
      isLoading: true,
      push: (path: string) => { }
   });
   useEffect(() => {
      if (document) {
         //@ts-ignore
         const params = window.fetchParams();

         setState((p: any) => ({
            ...p, params,
            isLoading: false,
            push: (path: string) => {
               //@ts-ignore
               window.framework.ROUTER.go(path)
               //@ts-ignore
               setState((p) => ({ ...p, path, params: window.fetchParams() }));
            },
            back: () => {
               //@ts-ignore
               window.framework.ROUTER.back()
               //@ts-ignore
               setState((p) => ({ ...p, path: window.location.pathname, params: window.fetchParams() }));
            }
         }));
      }
   }, []);
   return state;
}