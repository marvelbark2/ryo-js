//@ts-ignore
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
            //@ts-ignore
            const params = window.fetchParams();
            setState((p) => ({
                ...p, params, isLoading: false,
                push: (path) => {
                    //@ts-ignore
                    window.framework.ROUTER.go(path);
                    //@ts-ignore
                    setState((p) => ({ ...p, path, params: window.fetchParams() }));
                },
                back: () => {
                    //@ts-ignore
                    window.framework.ROUTER.back();
                    //@ts-ignore
                    setState((p) => ({ ...p, path: window.location.pathname, params: window.fetchParams() }));
                }
            }));
        }
    }, []);
    return state;
}
