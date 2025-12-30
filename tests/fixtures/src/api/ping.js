export function GET({ write }) {
    write("pong");
}

export async function POST({ body }) {
    const data = await body();

    return {
        status: 200,
        body: data
    }
}