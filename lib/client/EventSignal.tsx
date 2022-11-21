//@ts-ignore
import { useEffect, useRef, useState } from "react";




export default function EventSignal(source: string) {
    const [value, setValue] = useState("");
    const eventSource = useRef(null);

    useEffect(() => {
        if (window) {
            if (!eventSource.current) {
                eventSource.current = new EventSource(source)
            }
            eventSource.current.onmessage = (event: any) => {
                setValue(event.data);
            };
        }
        return () => {
            if (window)
                eventSource.current.close();
        };
    }, []);

    return value;
}