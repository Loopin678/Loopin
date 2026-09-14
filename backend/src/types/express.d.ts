import "express"
declare global{
    namespace Express{
        interface Request{
            user?: {
                id:string;
            }
        }
    }
}
export{}

/// this gives TS awareness of req.user