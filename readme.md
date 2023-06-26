# Ryo js

Small js fullstack framework blazly fast
**Memo version**
## Installation

```sh
npm i ryo.js #or npm i ryo.js@github:marvelbark2/ryo-js
```

## Features:
- Routing based filesystem
- Blazly fast (Try it by yourself)
- Everything on src folder
- Create apis, websockets, graphQL, Server-Sent-Events (SSE), preact components and serve static files.
- SPA routing which makes the site so fast (Using Flamethrower)
- Typescript (No types generated at least for now) supported without configuration needed (Example: https://github.com/marvelbark2/ryo-js-examples/blob/main/ryo-api/src/me.ts)

## what you can do with Ryo js:

* Routing system: Based on filesystem, you can build dynamic route, naming file with ":" prefix
    
* Preact Components:
    * Static Component (Sync data fetching): export data method returning a value
    * Static Component (Async data fetching): export data object contains:
        - runner: Function async accepts stop method as argument (stop: called to stop caching) returns a value
        - invalidate(Optional): Field, duration per second to cache value, it's a global value.
        - shouldUpdate(Optional): Function accepts two values (Old, new) to re-render component on runtime when data changed after the cache invalidated
        - You can also use file as datasource by specifying the file path in data field also specify parsing way
    * Server Component (TODO): export server method without returning anything
        - Here you can use async functional Component and use nodejs api and use JSX synthax but no client side will be run (Hooks, document ... will be ignored)
    * Parent Component: For each component type described before, you can wrap them with a component independent state, you can either add `entry.jsx` as global wrapper or you can add it to the component itself by exporting the component naming it `Parent` (Check the ex `Static async/fresh component` down below). If both used, the parent component declared in the component itself will be used. (If you're using refreshed Static async/fresh component, you should provide the id passed as parent component props in jsx/html element that will be used to revalidate the component after data updated)
      
      * Each component could have a offline version but just export offline as component function that will be used when the client is offline

* Api: export function with method name, like: ``` export get() { return ... }  ```
    * JSON api: By returning js objects parsable values
    * Streamable api: By returning object:
        - stream: Created stream, like readStream
        - length: Stream length (without reading it)
    * You can build versionable apis where you can name file like **service@1|2|...|n.(js|ts)**. Client-side, pass in http request header, a version as value for the key **X-API-VERSION**
    * GraphQL endpoints (Still fixing subscriptions): You can build many graphql endpoint with separated schema by naming the route with this extension .gql.(ts | js)
        
* Websockets: naming the file in src folder with ".ws.js" suffix:
    - Return object match uWebSockets.js documentation
* Server-Sent-Events: naming the file in src folder with ".ev.js" suffix:
    - Export default: object with invalidate field (ms) and runner function (Async with params route if needed)
* Subdomains: You can create subdomains by creating a folder with the _subdomains name in src folder and add index.js or index.ts file in it. (Example: _subdomains/api/index.ts) (You can use it to create a subdomain for your api) (You can also create dynamic subdomains by naming the folder with ":" prefix)
* Errors pages: You can create error pages by creating a folder with the _errors name in src folder and code error with tsx or jsx extension. (Example: _errors/4XX.tsx) (You can handle all the error that error number starts with 4 like 404, 413 ...)
* Security headers (2 complete): You can handle authentification and authorization by using ryo.config.js.
  
   Example with jwt authentification and subdomain for blog project:
    ```js
    // file: ryo.config.js
    /** @type {import('ryo.js').RyoConfig} */

    const bcrypt = require("bcrypt");
    const jsonwebtoken = require("jsonwebtoken");

    const BASE_HOST = process.env.BASE_HOST || "localhost:3000";

    const jwtAuthFilter = {
        doFilter(request, _response, setAuthContext, next) {
            const authHeader = request.getHeader("authorization");
            if (authHeader.length === 0 || !authHeader.startsWith("Bearer ")) {
                return next();
            }

            const jwt = authHeader.substring(7);
            const decoded = jsonwebtoken.verify(jwt, "secret");

            setAuthContext({
                id: decoded.username,
                roles: decoded.roles,
            })

            return next();
        }
    }

    module.exports = {
        subdomain: {
            baseHost: BASE_HOST,
        },
        security: {
            cors: false,
            csrf: true,
            authorizeHttpRequests: [
                {
                    path: ["/", "/*.{js,css}", "/images/*", "/blog", "/_subdomain/test/**/*.{js,css}", "/_subdomain/**/test"],
                    status: "allow",
                },
                {
                    path: ["/blog/ff", "/_subdomain/test/page"],
                    status: "auth",
                },
                {
                    path: "/_subdomain/test/",
                    roles: ["admin"],
                }

            ],
            authProvider: {
                async loadUserByUsername(username) {
                    return {
                        username,
                        plainTextPassword: bcrypt.hashSync("123456", 10),
                        roles: [username],
                        onLoginSuccess: (res) => {
                            const jwt = jsonwebtoken.sign({
                                username,
                                roles: [username]
                            }, "secret");

                            console.log({
                                jwt, res
                            });
                            res.writeHeader("Authorization", `Bearer ${jwt}`);

                            res.end("Done")
                        }
                    }
                },
                passwordEncoder: {
                    encode: async (password) => bcrypt.hash(password, 10),
                    matches: async (password, hash) => bcrypt.compare(password, hash),
                }
            },
            sessionManagement: {
                sessionCreationPolicy: "stateless",
            },
            filter: [
                jwtAuthFilter
            ]
        },
    }

    ```
## Progress Status:
- [ ] Preact Components
  - [X] Async static component
  - [X] Sync static component
  - [X] Server Component
  - [X] Server Component with hooks
  - [ ] Offline version
    - [X] Offline version local
    - [ ] Offline version global
- [X] Api
  - [X] JSON api
  - [X] Readable stream api

  - [ ] API tools 
    - [ ] generate api types on client side for type safe
- [X] GraphQL
  - [X] Query
  - [X] Mutation
  - [X] Subscription
  - [X] Playground on dev mode
- [X] Websockets
- [X] Server-Sent-Events
- [ ] Subdomains
  - [X] Static subdomains
  - [ ] Dynamic subdomains
  - [X] Api
  - [ ] GraphQL
  - [ ] SSE
  - [ ] Websockets
- [ ] Security context:
## Example:

### websockets:
```js
// Path: src/msg.ws.js
export default {
    open: (ws, req) => {
        console.log("NEW CLIENT on /msg");
    },

    message: (ws, message, isBinary) => { },

    close: (ws, code, message) => {

    }
}
```
### API

#### JSON API:

```js
// Path: src/api.js

export function get({ url }) {
    return {
        message: "Hello from " + url
    };
}

//body: object(json input) | Buffer(buffer array input) | undefined(none)
export function post({ body }) {
    // do something using body
    console.log({ body });
    return {
        message: "Hello from " + (typeof body)
    };
}
```

#### Streamable API:
```js
// Path: src/file.js

import fs from 'fs';
import { join } from 'path';

export function get({ url }) {
    const path = join(process.cwd(), "./screen.mov");
    const stream = fs.createReadStream(path)
    stream.on("error", () => {
        //Handle error to avoid server crash
        console.log("error");
    })
    const length = fs.statSync(path).size;
    return {
        stream, length
    };
}
```

#### GraphQL endpoint:

````js
// path: ttql.gql.ts
export default {
  schema: `
    type Query {
      hello: String
    }
    type Mutation {
      capitalize(message: String): String
    }
    `,
  resolvers: {
    hello: (_: unknown, ctx: { test: string }) => `${ctx.test}: hello world`,
    capitalize: ({ message }: { message: string }) => message.toUpperCase()
  },
  context: {
    test: "ME"
  }
}

````
use NODE_ENV=development to access graphql playground in GET request as example: /ttql.gql

##### Subscription:
```typescript

import { PubSub } from 'graphql-subscriptions'

const TODOS_CHANNEL = "TODOS_CHANNEL";

const pubsub = new PubSub();
const todos = [
    {
        id: "1",
        text: "Learn GraphQL + Soild",
        done: false,
    },
];

const typeDefs = `
    type Todo {
      id: ID!
      done: Boolean!
      text: String!
    }
    type Query {
      getTodos: [Todo]!
    }
    type Mutation {
      addTodo(text: String!): Todo
      setDone(id: ID!, done: Boolean!): Todo
    }
    type Subscription {
      todos: [Todo]!
    }
  `;

const resolvers = {
    getTodos: () => {
        return todos;
    },

    addTodo: (
        { text }: { text: string },
        { pubsub }: { pubsub: PubSub }
    ) => {
        const newTodo = {
            id: String(todos.length + 1),
            text,
            done: false,
        };

        todos.push(newTodo);
        pubsub.publish(TODOS_CHANNEL, { todos });
        return newTodo;
    },
    setDone: (
        { id, done }: { id: string; done: boolean },
        { pubsub }: { pubsub: PubSub }
    ) => {
        const todo = todos.find((todo) => todo.id === id);
        if (!todo) {
            throw new Error("Todo not found");
        }
        todo.done = done;
        pubsub.publish(TODOS_CHANNEL, { todos });
        return todo;
    },

    todos: (_: unknown, { pubsub }: { pubsub: PubSub }) => {
        const iterator = pubsub.asyncIterator(TODOS_CHANNEL);
        pubsub.publish(TODOS_CHANNEL, { todos });
        return iterator;
    },
}
export default {
    schema: typeDefs,
    resolvers: resolvers,
    context: {
        pubsub
    }
}
```
### Preact components:
#### Server components:
```js
//Path: src/server.jsx

export function server({ req }) {
    return {
        status: 201,
        headers: {
            "X-TEST": "YES",
        },
        body: {
            "From": "SERVER",
        }
    }
}

export default function index({ data }) {
    return (
        <div>
            <h1>Server Side Rendering <b></b></h1>

            <p>From: {data.From}</p>
        </div>
    )
}
```
#### Static sync component:
```js
// Path: src/index.jsx
// route: /

import { useEffect, useState } from "react";

// Server side function
export function data() {
    return {
        "counter": 3,
    }
}
export default function index({ data }) {
    const [count, setCount] = useState(data.counter);
   
    useEffect(() => {
        window.addEventListener('flamethrower:router:fetch-progress', ({ detail }) => {
            console.log('Fetch Progress:', detail);
        });

    }, [])
    return (
        <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
            <div className="flex flex-col w-full p-10 mx-24 border border-dashed border-gray-500 space-y-6 items-center">
                <p>You clicked <span className="font-bold text-lg text-gray-800">{count}</span> times</p>
                <button className="bg-blue-50 p-3 border-blue-700 text-blue-700 w-24 rounded-xl" onClick={() => setCount(count + 1)}>Click me</button>

                {/* SPA routing thanks to: Flamethrower */}
                <a href="/data">Data</a>
                <a href="/api">TEST</a>
            </div>
        </div>
    )
}
```

#### Static async/fresh component:
#### Runner Fn:
```js
// Path: src/counter.jsx
// route: /counter
type CounterDataType = { value: number, date: Date };

let count = 0;
export const data = {
    invalidate: 1,
    shouldUpdate: (_old: CounterDataType, newValue: CounterDataType) => newValue.value > 10,
    runner: async (stop: () => void, old?: CounterDataType) => {
        if (old?.count === 60) {
            stop();
        }
        return {
            value: count++,
            date: new Date()
        };
    }
}

// Parent Layout
export function Parent({ children }: { children: any }) {
    return (
        <div>
            <h1>Parent</h1>
            {children}
        </div>
    )
}
export default function index({ data }: { data: CounterDataType }) {
    return (
        <div>
            <p>
                COUNTING at {data.date.getTime()} ... {data.value}
            </p>
        </div>
    )
}
```

```js
//path: src/data.jsx
//route: /data

// Other example & router

import { PrismaClient } from '@prisma/client'
import { useEffect } from 'react';
import Btn from '../comp/Btn';
import Router from '../lib/router/router';

export const data = {
    invalidate: 1000,
    runner: async (stop) => {
        const prisma = new PrismaClient();
        const events = await prisma.event.findMany({});
        return { events };
    }
}
export default function index({ data }) {
    const router = Router();
    useEffect(() => {
        console.log({ data });
    }, [])
    if (router.isLoading) return <div>Loading...</div>
    return (
        <div>
            <p>
                <span onClick={() => router.back()}>BACK</span>
                <Btn text="TEST" />
                {
                    data.events.map((event) => {
                        return (
                            <div key={event.id}>
                                <a href={`/blog/${event.id}`}>{event.name}</a>
                            </div>
                        )
                    })
                }
            </p>
        </div>
    )
}
```
#### Source file:
```js
import Articles from "@/components/Articles";
import type { Article } from "@/types";
import type { RyoDataObject } from "ryo.js";

export const data: RyoDataObject = {
    source: {
        // root path is CWD
        file: "data/articles.json",
    },
    invalidate: 20,
    shouldUpdate: () => true
}
export default function App({ data }: { data: Article[] }) {
    return (
        <Articles articles={data} />
    )
}
```
### Dynamic route (component):

```js
//path: src/blog/:id.jsx
//route: /blog/ID

import { useEffect } from "react";
import Router from "ryo.js/router"

export default function index({ ...props }) {
    const router = Router();

    if (router.isLoading) return <div>Loading...</div>
    return (
        <div>
            Blog id: {router.query.id}
            <span >Return Back</span>
        </div>
    )
}
```


```js
//path: src/events/:id.ev.js
//route: /events/ID.ev

export default {
    invalidate: 1000,
    runner: async ({ params }) => {
        console.log(params)
        return { message: "I'm the user: " + params.id };
    }
}


```

### Offline component:

in the example suppose the display the default component if the user is online and the offline component if the user is offline (or if the server is down)
```js
import { useEffect, useState } from "react";
import { test } from "@lib/db-exec";
import toast, { Toaster } from 'react-hot-toast';

function data() {
    test()
    //test()
    return {
        "counter": 3,
        saveOnData(data: any) {
            console.log(data)
        }
    }
}

// Offline component
export function offline() {
    const [counter, setCounter] = useState(0);
    return (
        <div className="bg-gray-50">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 10000,
                }}
            />

            <button className="px-4 py-2 bg-blue-900 text-white rounded-2xl" onClick={() => toast.success("Good")} >Toast</button>
            <button className="mx-3 px-4 py-2 text-blue-900 border-blue-900 border bg-white rounded-2xl"
                onClick={() => setCounter(c => c + 1)}
            >
                counting <b>{counter}</b>
            </button>

        </div>
    )
}


export default function index({ data }: { data: { counter: number, saveOnData: (data: any) => void } }) {
    const [count, setCount] = useState(data.counter);
    useEffect(() => {
        console.log("Hello from client side: ", data)
    }, [data]);

    return (
        <div className="w-screen h-screen flex items-center justify-center bg-gray-50">
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 10000,
                }}
            />
            <div className="flex flex-col w-full p-10 mx-24 border border-dashed border-gray-500 space-y-6 items-center">
                <p>You clicked <span className="font-bold text-lg text-gray-800">{count}</span> times</p>
                <button className="bg-blue-50 p-3 border-blue-700 text-blue-700 w-24 rounded-xl" onClick={() => setCount(count + 1)}>Click me</button>

                <span className="hover:cursor-pointer" onClick={() => toast.success('HOL')}>TOAST click</span>

                {/* SPA routing thanks to: Flamethrower */}
                <a href="/data">Data</a>
                <a href="/api">TEST</a>
                <button onClick={() => data.saveOnData({ a: "me" })}>API TEST</button>
            </div>
        </div>
    )
}

export {
    data
}
```
### Middleware:
You can add middleware by adding a file in root of the project: **middleware.(ts|js)**
You can also have catch errors by using last argument of the middleware function which could be null
#### Example:

```js
//path: middleware.js

const getCookie = (req, name) => 
(req.cookies ??= req.getHeader('cookie')).match(getCookie[name] ??= new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`))?.[2]

export default function middleware(req, res, next, error) {
    const user = getCookie(req, "user")
    if (user) {
        return next();
    } else {
        res.writeHeader("Set-Cookie", "user=Guest")
        return res.writeStatus("401").end("You are not authorized")
    }
}

```
### More examples:
https://github.com/marvelbark2/ryo-js-examples

## Primary deps:

- Esbuild
- Babel
- uwebSockets.js
- Flamethrower

## Thanks to:
- https://github.com/lydiahallie/byof-demo

Fill free to add PRs or issues