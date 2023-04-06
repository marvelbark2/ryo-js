interface Output {
    $class: string;
    source: string
}

type Payload = Output & any
interface Special {
    $class: string;
    match: (obj: any) => boolean;
    serialize: (obj: any) => Payload;
    deserialize: (obj: Payload) => any;
}


class ObjectHandler {
    constructor(private object: any) { }
    isArray() {
        return Array.isArray(this.object) || this.object instanceof Array;
    }

    isObject() {
        //detect only simple objects
        return this.object.__proto_ === Object.prototype
    }

    each(iterator: any) {
        for (const key in this.object) if (this.object.hasOwnProperty(key)) iterator(this.object[key]);
    }

    map(iterator: any) {
        const obj = this.object;
        if (Array.isArray(obj)) return obj.map(iterator);

        const newObj: any = {};
        for (const key in obj)
            if (obj.hasOwnProperty(key)) newObj[key] = iterator(obj[key]);
        return newObj;
    }
}


const defaultSpecials: Special[] = [
    {
        $class: 'regexp',
        match: function (obj) {
            return obj instanceof RegExp;
        },
        serialize: function (obj) {
            return {
                $class: this.$class,
                source: obj.source,
                global: obj.global,
                multiline: obj.multiline,
                lastIndex: obj.lastIndex,
                ignoreCase: obj.ignoreCase,
            };
        },
        deserialize: function (json) {
            let flags = "";

            flags += json.global ? "g" : "";
            flags += json.multiline ? "m" : "";
            flags += json.ignoreCase ? "i" : "";

            const regexp = new RegExp(json.source, flags);

            regexp.lastIndex = json.lastIndex;

            return regexp;
        },
    },
    {
        $class: 'function',
        match: function (obj) {
            return obj instanceof Function;
        },
        serialize: function (obj) {
            return {
                $class: this.$class,
                source: obj.toString(),
            };
        },
        deserialize: function (json) {
            return new Function(`return ${json.source}`)();
        },
    },
    {
        $class: 'date',
        match: function (obj) {
            return obj instanceof Date;
        },
        serialize: function (obj) {
            return {
                $class: this.$class,
                source: obj,
            };
        },
        deserialize: function (json) {
            return new Date(json.source);
        },
    },
]

export class Specials {
    private specials: Special[] = [...defaultSpecials];

    add(special: Special) {
        this.specials.push(special);
    }

    match(obj: any) {
        return this.specials.find(s => s.match(obj));
    }

    byClass($class: string) {
        return this.specials.find(s => s.$class === $class);
    }
}

export class Serializer {
    private objectHandler: ObjectHandler;
    constructor(object: object, private specials: Specials = new Specials()) {
        this.objectHandler = new ObjectHandler(object);
    }


    private handleValue(val: any): any {
        let json;
        if (val) {
            const specials = this.specials;
            const special = specials.match(val);
            if (special) {
                json = special.serialize(val);
                const currentNodeHandler = new ObjectHandler(val);
                if (currentNodeHandler.isArray()) {
                    json = val.map((item: any) => this.handleValue(item));
                } else if (currentNodeHandler.isObject())
                    json = this.handleValue(val);
            }
        }
        return json ? json : val;
    }

    toJSON() {
        const rootNodeHandler = this.objectHandler;
        const payload = rootNodeHandler.map((node: any) => this.handleValue(node));
        return JSON.stringify(payload);
    }
}

export class Deserializer {
    private objectHandler: ObjectHandler;

    constructor(json: string, private specials = new Specials()) {
        this.objectHandler = new ObjectHandler(JSON.parse(json));
    }


    private handleNode(node: any): any {
        let obj;
        if (node?.$class) {
            const special = this.specials.byClass(node.$class);
            if (special) obj = special.deserialize(node);
        }
        const currentNodeHandler = new ObjectHandler(node);

        if (currentNodeHandler.isArray()) {
            obj = node.map((item: any) => this.handleNode(item));
        }
        else if (currentNodeHandler.isObject())
            obj = this.handleNode(obj);

        return obj ? obj : node;
    }
    fromJSON() {
        const object = this.objectHandler;
        if (object.isArray()) return object.map((node: any) => this.handleNode(node));
        return object.map((node: any) => this.handleNode(node));
    }
}