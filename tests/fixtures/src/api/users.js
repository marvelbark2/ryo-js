const users = [
    { id: 1, name: "Alice", email: "alice@example.com" },
    { id: 2, name: "Bob", email: "bob@example.com" },
    { id: 3, name: "Charlie", email: "charlie@example.com" },
];

export function get() {
    return {
        users,
        count: users.length,
    };
}

export async function post({ body }) {
    const parsedBody = await body();
    const newUser = {
        id: users.length + 1,
        ...parsedBody,
    };
    users.push(newUser);
    return {
        success: true,
        user: newUser,
    };
}
