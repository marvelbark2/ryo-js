# Ryo js

Small js fullstack framework blazly fast
**Memo version**
## Installation

```sh
npm i ryo.js #or npm i ryo.js@github:marvelbark2/ryo-js
npm i @luncheon/esbuild-plugin-gzip babel-preset-preact -D
```

## Features:
- Routing based filesystem
- Blazly fast (Try it by yourself :) )
- Everything on src folder
- Create apis, websockets, server files and preact components
- SPA routing which makes the site so fast (Using Flamethrower)
- Typescript (No types generated at least for now) supported without configuration needed (Example: https://github.com/marvelbark2/ryo-js-examples/blob/main/ryo-api/src/me.ts)

## what you can do with Ryo js:

* Routing system: Based on filesystem, you can build dynamic route, naming file with ":" prefix
    
* Preact Components:
    * Static Component (Sync data fetching): export data method returning a value
    * Static Component (Async data fetching): export data object contains:
        - runner: Function async accepts stop method as argument (stop: called to stop caching) returns a value
        - invalidate(Optional): Field, duration per second to cache value
        - shouldUpdate(Optional): Function accepts two values (Old, new) to re-render component on runtime when data changed after the cache invalidated
    * Server Component: export server method without returning anything
        - Here you can use async functional Component and use nodejs api and use JSX synthax but no client side will be run (Hooks, document ... will be ignored)

* Api: export function with method name, like: ``` export get() { return ... }  ```
    * JSON api: By returning js objects parsable values
    * Streamable api: By returning object:
        - stream: Created stream, like readStream
        - length: Stream length (without reading it)
        
* Websockets: naming the file in src folder with ".ws.js" suffix:
    - Return object match uWebSockets.js documentation
* Event streams: naming the file in src folder with ".ev.js" suffix:
    - Export default: object with invalidate field (ms) and runner function (Async with params route if needed)

## Example: (All demos on src folder)

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
        message: "Hello from "
    };
}

//body: object(json input) | Buffer(buffer array input) | undefined(none)
export function post({ body }) {
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

### Preact components:
#### Server components:

At least for now, ** You can't import other components ** 
```js
//Path: src/server.jsx

import { PrismaClient } from "@prisma/client";

export function server() {

}

const prisma = new PrismaClient();

const Btn = ({ text }) => {
    return (
        <button onClick={() => {
            console.log('clicked')
        }}>{text}</button>
    )
}
export default async function SSRPage() {
    const data = await prisma.event.findMany();
    console.log(data.length)
    return (

        <div>
            <ul>
                {data.map((ev) => (
                    <li key={ev.id}>
                        <Btn text={ev.name} />
                    </li>
                ))}
            </ul>

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

```js
// Path: src/counter.jsx
// route: /counter
type CounterDataType = { value: number, date: Date };

let count = 0;
export const data = {
    invalidate: 1,
    shouldUpdate: (_old: CounterDataType, newValue: CounterDataType) => newValue.value > 10,
    runner: async (stop: () => void) => {
        if (count === 60) {
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

### 

### Build & serve

```bash
npm run build && npm run start
```

### More examples:
https://github.com/marvelbark2/ryo-js-examples

## Library Using:

- Esbuild
- Babel
- uwebSockets.js
- Flamethrower

## inspired:
- https://github.com/lydiahallie/byof-demo