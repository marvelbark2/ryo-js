import logger from "../../utils/logger"

interface RouteValidatorConstructor {
    routes: string[]
}

interface RouteValidatorRule {
    execute: () => void
}


interface RouteNode {
    name: string
    path: string
    children: RouteNode[] | null
}


export default class RouteValidator {
    private rules: RouteValidatorRule[] = []
    private routes: RouteNode[] = []
    constructor(private opts: RouteValidatorConstructor) {
        this.convertToTree()
        console.log(JSON.stringify(this.routes[0]))
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

    printTrace() {
        logger.error("Error: RouteValidator is not implemented yet")
    }
    isValide() {
        return true
    }
}

