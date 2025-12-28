import { useState } from "preact/hooks";

export function data() {
    return {
        message: "Hello from Ryo.js",
        counter: 0,
    };
}

export default function Index({ data }) {
    const [count, setCount] = useState(data.counter);

    return (
        <div className="container">
            <h1>{data.message}</h1>
            <p>Counter: <span id="counter">{count}</span></p>
            <button id="increment" onClick={() => setCount(count + 1)}>
                Increment
            </button>
            <nav>
                <a href="/about">About</a>
                <a href="/api/hello">API Test</a>
                <a href="/users/123">Dynamic Route</a>
            </nav>
        </div>
    );
}
