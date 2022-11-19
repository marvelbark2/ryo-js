type StringListener = (value: string) => void;

function createObserver(): {
    subscribe: (listener: StringListener) => () => void;
    publish: (event: string) => void;
} {
    let listeners: StringListener[] = [];

    return {
        subscribe: (listener: StringListener): (() => void) => {
            listeners.push(listener);
            return () => {
                listeners = listeners.filter((l) => l !== listener);
            };
        },
        publish: (event: string) => {
            listeners.forEach((l) => l(event));
        },
    };
}

export default createObserver();