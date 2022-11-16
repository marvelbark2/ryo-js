export function get({ url }) {
    return {
        message: "Hello from "
    };
}

export function post({ body }) {
    console.log({ body });
    return {
        message: "Hello from " + (typeof body)
    };
}