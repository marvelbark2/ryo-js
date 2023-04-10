import logger from "../../utils/logger"

interface RouteValidatorConstructor {
    routes: string[]
}

interface RouteValidatorRule {
    name: string
    execute: () => void | Error
}


interface RouteNode {
    name: string
    path: string
    children: RouteNode[] | null
}


export default class RouteValidator {
    private rules: RouteValidatorRule[] = []
    private routes: RouteNode[] = []
    private errors: Error[] = [];
    constructor(private opts: RouteValidatorConstructor) {
        this.init()
    }

    init() {
        this.convertToTree()
        this.initRules()
    }

    convertToTree() {
        // modulePages.map(x => x.replace(`${process.cwd()}/src`, ''))

        const routes = this.opts.routes.map(x => x.replace(`${process.cwd()}/src`, '(root)'))
        const tree: RouteNode[] = []

        routes.forEach(route => {
            const parts = route.split('/').filter(x => x)
            let current: RouteNode[] | null = tree
            parts.forEach(part => {
                const node = current?.find(x => x.name === part)
                if (node) {
                    current = node.children
                } else {
                    const newNode: RouteNode = {
                        name: part,
                        path: part,
                        children: []
                    }
                    if (current) {
                        current.push(newNode)
                    } else {
                        current = [newNode]
                    }
                    current = newNode.children
                }
            })
        })

        this.routes = tree
    }

    initRules() {
        this.rules.push({
            name: "Levels bounds",
            execute: () => {
                function checkNodesAndChildren(node: RouteNode | null): boolean {
                    if (node === null || node.children === null) return true;
                    const x = node.children.some((x) => x.name === node.name);

                    if (!x) {
                        return node.children.some((x) => checkNodesAndChildren(x))
                    }
                    return false;
                }

                const v = this.routes.some(checkNodesAndChildren);

                if (!v)
                    return new Error("Bad Routes boundry");

            }
        })
    }

    startValidation() {
        this.rules.every((rule) => {
            const exec = rule.execute();
            if (exec instanceof Error) {
                this.errors.push(exec);
                return false;
            }

            return true;
        });
    }

    printTrace() {
        logger.error("Error: RouteValidator is not implemented yet")
    }
    isValide() {
        return true
    }
}

