import { useEffect, useState } from "react";

export function data() {
    return {
        "counter": 3,
    }
}
export default function index({ data, ...props }) {
    const [count, setCount] = useState(data.counter);
    if (data === undefined) {
        return (
            <div>
                <p>
                    {JSON.stringify(props, null, 2)}
                </p>
            </div>
        )
    }
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
                <a href="/data">Data</a>
                <a href="/api">TEST</a>
            </div>
        </div>
    )
}