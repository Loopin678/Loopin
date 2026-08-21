import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto"

import { createUser, 
    findUserByEmail, 
    findUserByGoogleId, 
    findUserById,
 } from "../repositories/user.repository";

import {User} from "../types/user.js"
import {JWT_EXPIRES_IN, JWT_SECRET} from "../library/auth.js";
import { error } from "console";


export type PublicUser = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
};

function toPublicUser(user: User):PublicUser{
    return{
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
    };
};

export async function registerUser(name: string, email: string, password: string):Promise<PublicUser>{
    const normalizedEmail = email.toLowerCase().trim();

    const existingUser = await findUserByEmail(normalizedEmail);

    if(existingUser){
        throw new Error("User already exists");
    }
    const passwordHash = await bcrypt.hash(password, 12);

    const user: User = {
        id: crypto.randomUUID(),
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date(),
    };

    const createdUser = await createUser(user);

    return toPublicUser(createdUser);
}

export async function loginUser(email: string, password: string): Promise<{user: PublicUser; token: string;}>{

    const normalizedEmail = email.toLowerCase().trim();

    const user = await findUserByEmail(normalizedEmail);

    if(!user){
        throw new Error("INVALID_CREDENTIALS");
    }
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if(!passwordMatches){
        throw new Error("INVALID_CREDENTIALS");
    }
    const token = jwt.sign({
        userId: user.id,
    },JWT_SECRET,
    {
        expiresIn: JWT_EXPIRES_IN,
    }
);
    return{
        user: toPublicUser(user),
        token,
    };
}

// this shit migt actually be bugged
// we gotta fix this later
export async function loginWithGoogle(googleId: string, name: string, email: string): Promise<{user: PublicUser; token: string;}>{
    let user = await findUserByGoogleId(googleId);
    // existing google account

    if(!user){
        /*
            check if this non google user's email already belongs to a TeamSync Account 
        */
       const exisitngEmailUser = await findUserByEmail(email);
        if(exisitngEmailUser){
            throw new Error("EMAIL_ALREADY_REGISTERED");
        }
        user={
            id: crypto.randomUUID(),
            name,
            email: email.toLowerCase().trim(),
            provider: "google",
            googleId,
            createdAt: new Date()
        };
        user = await createUser(user);

        const token = jwt.sign(
            {
                userId: user.id,
            },
            JWT_SECRET,
            {
                expiresIn: JWT_EXPIRES_IN,
            }
        );
        return{
            user: toPublicUser(user),
            token,
        };

    }
}



export async function getUserById(id: string): Promise<PublicUser | null>{
    const user = await findUserById(id);

    if(!user){
        return null;
    }
    return toPublicUser(user);
}

// export const authService = new authService();