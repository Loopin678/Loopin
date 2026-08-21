export{}

declare global{
    namespace Express{
        interface Request{
            userId?: string;
        }
    }
}

/// this gives TS awareness of req.user