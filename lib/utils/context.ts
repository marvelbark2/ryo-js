import { EventEmitter } from "stream";

class Context {
    private readonly eventEmitter = new EventEmitter();
    private readonly store: Map<string, any> = new Map();

    get<T = any>(key: string): T | undefined {
        return this.store.get(key);
    }

    set<T = any>(key: string, value: T): this {
        this.store.set(key, value);
        return this;
    }

    has(key: string): boolean {
        return this.store.has(key);
    }

    delete(key: string): boolean {
        return this.store.delete(key);
    }

    public emit(key: string, value: any) {
        this.eventEmitter.emit(key, value);
    }

    public subscribe(key: string, listener: (value: any) => void): () => void {
        this.eventEmitter.on(key, listener);
        return () => {
            this.eventEmitter.off(key, listener);
        };
    }
}

export { Context };