const path = "/Users/johnnakamura/projects/ryo-app/src/index.jsx";
const register = require("@babel/register");
register({
    "presets": [
        "preact"
    ],
    "plugins": [
    ]
})
import(path).then((module) => {
    console.log({ module });
})