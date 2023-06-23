import type { HttpResponse } from "uWebSockets.js";

export const isAuth = (res: HttpResponse) => {
    return res.authContext && res.authContext.id;
}

const sessionPassword = {
    password: ""
};


export {
    sessionPassword
}