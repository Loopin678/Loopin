import { Request, Response } from "express";
import { getUserById, loginUser ,registerUser } from "../services/auth.service";
import { findUserById } from "../repositories/user.repository";

export async function register(req: Request, res: Response): Promise<void>{
    try {
        const {name, email, password } = req.body;
        
        if(!name || !email || !password){
            res.status(400).json({
                message: "name, email, password are required"
            });
            return;
        }
        

        if(password.length < 8){
            res.status(400).json({
                message: "Password must be atleast 8 characters",
            });
            return;
        }

        const user = await registerUser(name, email, password);

        res.status(201).json({user});

    } catch (error) {
        if(error instanceof Error){
            if(error.message === "USER_ALREADY_EXISTS"){
                res.status(409).json({
                    message: "User with this email already exists"
                })
                return;
            }
        }
        console.error(error);

        res.status(500).json({
            message: "Internal Server Error"
        });
    }
}

export async function login(req: Request, res: Response): Promise<void>{
try {
    const {email, password} = req.body;

    if(!email || !password){
        res.status(400).json({
            message:"All fields are required"   
        })
        return;
    }
    const {user, token} = await loginUser(email, password);

    res.cookie("auth_token",token,{
        httpOnly: true,
        sameSite: "lax",
        secure: false,
        maxAge: 7*24*60*60*1000
    })
    res.status(200).json({
        user,
    });

} catch (error){
    if(error instanceof Error &&
        error.message === "INVALID_CREDENTIALS"
    ){
        res.status(401).json({
            message: "Invalid email or password",
        });
        return;
    }
    res.status(500).json({
        message: "Internal Server Error"
    })
}
}
export function logout(req: Request, res: Response): void{
    res.clearCookie("auth_token");

    res.status(200).json({
        message:"Logged out successfully"
    })
}
export async function me(req: Request, res: Response): Promise<void>{
try {
    const userId = req.user?.id;

    if(!userId){
        res.status(401).json({
            message: "Unauthorized",
        });
        return;
    }

    const user = await findUserById(userId);

    if(!user){
        res.status(404).json({
            message: "User not found"
        });
        return ;
    }

    res.status(200).json({
        user
    });

} catch (error) {
    console.error(error);

    res.status(500).json({
        message:"Internal Server Error"
    });
}
}