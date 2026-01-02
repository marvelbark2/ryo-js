type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "HEAD" | "OPTIONS";
type HttpReqSecStatus = "allow" | "deny" | "auth";


type AuthContextPayload = { id: string, roles: string[] }

type RoleOrStatus = ({
    status: HttpReqSecStatus,
} | {
    roles: string[],
})

type A = (AuthContextPayload & {
    plainTextPassword: string;
    onLoginSuccess?: (res: any, req: any) => void;
    onLoginFailed?: (res: any, req: any) => void;
})
declare module "RyoConfig" {
    export type RyoConfig = {
        port?: number;
        server_engine?: "uws" | "rust" | "node";
        ssl?: {
            key_file_name: string,
            cert_file_name: string,
            passphrase: string
        }
        build?: {
            outDir?: string;
            srcDir?: string;
        },

        subdomain?: {
            baseHost?: string;
        },

        security?: {
            csrf?: boolean;
            cors?: {
                origin: string,
                methods?: string[],
                allowedHeaders?: string[],
                exposedHeaders?: string[],
                maxAge?: number,
            } | false;
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
            authProvider?: {
                loadUserByUsername(username: string): (
                    A
                    | Promise<A>
                    | null),
                passwordEncoder?: {
                    encode(plainTextPassword: string): Promise<string> | string;
                    matches(plainTextPassword: string, encodedPassword: string): Promise<boolean> | boolean;
                }
            },
            loginPath?: string;
        }
    }
}