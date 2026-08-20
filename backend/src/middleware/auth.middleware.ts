import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken"

import { JWT_SECRET } from "../library/auth";

type AuthPayload={
    userId: string;
};
/*
Auth payload is data sent during login or signup request
 */

export function requireAuth(req: Request, res: Response, next: NextFunction): void{
    const token = req.cookies?.auth_token;

    if(!token){
        res.status(401).json({
            message: "Authentication required",
        });
        return ;
    }
try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;

    req.user = {
        id: payload.userId
    };
    next();

} catch (error) {
    res.status(401).json({
        message: "Invalid or expired authentication token"
    })
}
}