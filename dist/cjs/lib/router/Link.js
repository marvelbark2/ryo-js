"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Link(props) {
    return (
    //@ts-ignore
    <a href={props.href}>{props.children}</a>);
}
exports.default = Link;
