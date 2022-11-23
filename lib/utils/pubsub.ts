type StringListener = (value: string, data?: any) => void;

function createObserver(): {
    subscribe: (listener: StringListener) => () => void;
    publish: StringListener;
} {
    let listeners: StringListener[] = [];

    return {
        subscribe: (listener: StringListener): (() => void) => {
            listeners.push(listener);
            return () => {
                listeners = listeners.filter((l) => l !== listener);
            };
        },
        publish: (event: string, data?: any) => {
            listeners.forEach((l) => l(event, data));
        },
    };
}

export default createObserver();