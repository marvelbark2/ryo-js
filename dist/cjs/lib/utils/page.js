"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPages = exports.getPageName = void 0;
var fs_1 = require("fs");
function getPageName(filePath) {
    var relativePath = filePath.split("/src/")[1];
    return relativePath.replace(/\.[^/.]+$/, "");
}
exports.getPageName = getPageName;
function getPages(dirPath, join) {
    return (0, fs_1.readdirSync)(dirPath)
        .map(function (file) {
        var filepath = join(dirPath, file);
        if ((0, fs_1.statSync)(filepath).isDirectory()) {
            return getPages(filepath, join);
        }
        else {
            return filepath;
        }
    })
        .filter(Boolean)
        .flat(2);
}
exports.getPages = getPages;
