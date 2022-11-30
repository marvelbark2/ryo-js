"use strict";
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Deserializer = exports.Serializer = exports.Specials = void 0;
var ObjectHandler = /** @class */ (function () {
    function ObjectHandler(object) {
        this.object = object;
    }
    ObjectHandler.prototype.isArray = function () {
        return Array.isArray(this.object) || this.object instanceof Array;
    };
    ObjectHandler.prototype.isObject = function () {
        //detect only simple objects
        return this.object.__proto_ === Object.prototype;
    };
    ObjectHandler.prototype.each = function (iterator) {
        for (var key in this.object)
            if (this.object.hasOwnProperty(key))
                iterator(this.object[key]);
    };
    ObjectHandler.prototype.map = function (iterator) {
        var obj = this.object;
        if (Array.isArray(obj))
            return obj.map(iterator);
        var newObj = {};
        for (var key in obj)
            if (obj.hasOwnProperty(key))
                newObj[key] = iterator(obj[key]);
        return newObj;
    };
    return ObjectHandler;
}());
var defaultSpecials = [
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
            var flags = "", regexp;
            flags += json.global ? "g" : "";
            flags += json.multiline ? "m" : "";
            flags += json.ignoreCase ? "i" : "";
            regexp = new RegExp(json.source, flags);
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
            return new Function("return " + json.source)();
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
];
var Specials = /** @class */ (function () {
    function Specials() {
        this.specials = __spreadArray([], defaultSpecials, true);
    }
    Specials.prototype.add = function (special) {
        this.specials.push(special);
    };
    Specials.prototype.match = function (obj) {
        return this.specials.find(function (s) { return s.match(obj); });
    };
    Specials.prototype.byClass = function ($class) {
        return this.specials.find(function (s) { return s.$class === $class; });
    };
    return Specials;
}());
exports.Specials = Specials;
var Serializer = /** @class */ (function () {
    function Serializer(object, specials) {
        if (specials === void 0) { specials = new Specials(); }
        this.specials = specials;
        this.objectHandler = new ObjectHandler(object);
    }
    Serializer.prototype.handleValue = function (val) {
        var _this = this;
        var json;
        if (val) {
            var specials = this.specials;
            var special = specials.match(val);
            if (special) {
                json = special.serialize(val);
                var currentNodeHandler = new ObjectHandler(val);
                if (currentNodeHandler.isArray()) {
                    json = val.map(function (item) { return _this.handleValue(item); });
                }
                else if (currentNodeHandler.isObject())
                    json = this.handleValue(val);
            }
        }
        return json ? json : val;
    };
    Serializer.prototype.toJSON = function () {
        var _this = this;
        var rootNodeHandler = this.objectHandler;
        var payload = rootNodeHandler.map(function (node) { return _this.handleValue(node); });
        return JSON.stringify(payload);
    };
    return Serializer;
}());
exports.Serializer = Serializer;
var Deserializer = /** @class */ (function () {
    function Deserializer(json, specials) {
        if (specials === void 0) { specials = new Specials(); }
        this.specials = specials;
        this.objectHandler = new ObjectHandler(JSON.parse(json));
    }
    Deserializer.prototype.handleNode = function (node) {
        var _this = this;
        var obj;
        if (node && node.$class) {
            var special = this.specials.byClass(node.$class);
            if (special)
                obj = special.deserialize(node);
        }
        var currentNodeHandler = new ObjectHandler(node);
        if (currentNodeHandler.isArray()) {
            obj = node.map(function (item) { return _this.handleNode(item); });
        }
        else if (currentNodeHandler.isObject())
            obj = this.handleNode(obj);
        return obj ? obj : node;
    };
    Deserializer.prototype.fromJSON = function () {
        var _this = this;
        var object = this.objectHandler;
        if (object.isArray())
            return object.map(function (node) { return _this.handleNode(node); });
        return object.map(function (node) { return _this.handleNode(node); });
    };
    return Deserializer;
}());
exports.Deserializer = Deserializer;
