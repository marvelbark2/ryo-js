export function get({ url }) {
    return {
        message: "Hello from API",
        path: url,
        timestamp: new Date().toISOString(),
    };
}

export async function post({ body }) {
    const parsedBody = await body();
    return {
        received: parsedBody,
        echo: true,
    };
}
