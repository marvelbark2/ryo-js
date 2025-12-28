export default {
    schema: `
        type Query {
            hello: String
            users: [User]
        }
        type User {
            id: ID!
            name: String!
        }
        type Mutation {
            addUser(name: String!): User
        }
    `,
    resolvers: {
        hello: () => "Hello from GraphQL",
        users: () => [
            { id: "1", name: "Alice" },
            { id: "2", name: "Bob" },
        ],
        addUser: ({ name }: { name: string }) => ({
            id: String(Date.now()),
            name,
        }),
    },
};
