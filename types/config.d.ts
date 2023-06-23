type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
type HttpReqSecStatus = "allow" | "deny" | "auth";


type AuthContextPayload = { id: string, roles: string[] }

type RoleOrStatus = ({
    status: HttpReqSecStatus,
} | {
    roles: string[],
})
declare module "RyoConfig" {
    export type Config = {
        port?: number;
        build?: {
            outDir?: string;
            srcDir?: string;
        },

        subdomain?: {
            baseHost?: string;
        }

        security?: {
            csrf?: boolean;
            cors?: string[] | false;
            authorizeHttpRequests?: (RoleOrStatus & {
                method?: HttpMethod,
                path: string | string[]
            })[],
            sessionManagement?: {
                sessionCreationPolicy: "ifRequired" | "stateless",
            }
            filter?: {
                doFilter(req: any, res: any, setAuthContext: (authPayload: AuthContextPayload) => void, next: any): void;
            }[],
            authProvider: {
                authenticate(username: string): (
                    (AuthContextPayload & {
                        plainTextPassword: string;
                        passwordEncoder: (string: string) => string;
                    })
                    | null);
            },
            loginPath?: string;
        }
    }
}