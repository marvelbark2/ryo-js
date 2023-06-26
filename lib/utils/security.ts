import type { HttpResponse } from "uWebSockets.js";
import { existsSync, readFileSync, writeFileSync } from "fs"
import Tokens from 'csrf';
import { join } from "path";


export const isAuth = (res: HttpResponse) => {
    return res.authContext && res.authContext.id;
}

const sessionPassword = {
    password: ""
};


const tokens = new Tokens();

const csrfTokenFile = join(process.cwd(), ".ssr/secret");
const getSecretToken = () => {
    if (existsSync(csrfTokenFile)) {
        return readFileSync(csrfTokenFile, "utf-8");
    } else {
        return tokens.secretSync();
    }
}

const secret = getSecretToken()

const verifyToken = (token: string) => tokens.verify(secret, token);
const generateToken = () => tokens.create(secret);
const saveSecretToken = () => writeFileSync(csrfTokenFile, secret)
const csrf = {
    verifyToken,
    generateToken,
    saveSecretToken
}

function globToRegex(glob: string, opts?: { extended?: boolean; globstar?: boolean; flags?: string }): RegExp {
    if (typeof glob !== 'string') {
        throw new TypeError('Expected a string');
    }

    const str = String(glob);

    let reStr = "";
    const extended = opts ? !!opts.extended : false;
    const globstar = opts ? !!opts.globstar : false;
    let inGroup = false;
    const flags = opts && typeof opts.flags === "string" ? opts.flags : "";

    for (let i = 0, len = str.length; i < len; i++) {
        const c = str[i];

        switch (c) {
            case "/":
            case "$":
            case "^":
            case "+":
            case ".":
            case "(":
            case ")":
            case "=":
            case "!":
            case "|":
                reStr += "\\" + c;
                break;

            case "?":
                if (extended) {
                    reStr += ".";
                    break;
                }

            case "[":
            case "]":
                if (extended) {
                    reStr += c;
                    break;
                }

            case "{":
                if (extended) {
                    inGroup = true;
                    reStr += "(";
                    break;
                }

            case "}":
                if (extended) {
                    inGroup = false;
                    reStr += ")";
                    break;
                }

            case ",":
                if (inGroup) {
                    reStr += "|";
                    break;
                }
                reStr += "\\" + c;
                break;

            case "*":
                let prevChar = str[i - 1];
                let starCount = 1;
                while (str[i + 1] === "*") {
                    starCount++;
                    i++;
                }
                const nextChar = str[i + 1];

                if (!globstar) {
                    reStr += ".*";
                } else {
                    const isGlobstar =
                        starCount > 1 &&
                        (prevChar === "/" || prevChar === undefined) &&
                        (nextChar === "/" || nextChar === undefined);

                    if (isGlobstar) {
                        reStr += "((?:[^/]*(?:\/|$))*)";
                        i++;
                    } else {
                        reStr += "([^/]*)";
                    }
                }
                break;

            default:
                reStr += c;
        }
    }

    if (!flags || !~flags.indexOf("g")) {
        reStr = "^" + reStr + "$";
    }

    return new RegExp(reStr, flags);
}

export {
    sessionPassword,
    csrf,
    globToRegex
}