export{}

declare global{
    namespace Express{
        interface Request{
            user?:{
                id: string;
            }
        }
    }
}

/// this gives TS awareness of req.user