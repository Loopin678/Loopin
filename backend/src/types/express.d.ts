import "express"
declare global{
    namespace Express{
        interface Request{
            user?: {
                id:string;
            }
            // How the request authenticated: the website's session cookie/JWT,
            // or a desktop/CLI token from "Sign in with Loopin"
            authKind?: "session" | "client-token";
            clientTokenId?: string;
        }
    }
}
export{}

/// this gives TS awareness of req.user