import { Serializer, Deserializer } from "./lib/utils/serializer";

const obj = [
    {
        "name": "John",
        "age": 30
    },
    {
        "name": "Peter",
        "age": 40
    },
    {
        "name": "John",
        "age": 30
    },
]


const serialized = new Serializer(obj).toJSON();

const deserialize = new Deserializer(serialized).fromJSON();

console.log(deserialize);