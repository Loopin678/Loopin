import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

import { 
    createUser, 
    findUserByEmail, 
    findUserByGoogleId, 
    findUserById,
} from "../repositories/user.repository";

import { JWT_EXPIRES_IN, JWT_SECRET } from "../library/auth";


export type PublicUser = {
    id: string;
    name: string;
    email: string;
    createdAt: Date;
};

function generateToken(userId: string): string {
  return jwt.sign(
    {
      userId,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_EXPIRES_IN,
    }
  );
}

function toPublicUser(user:{ 
    id: string;
    name: string;
    email: string;
    createdAt: Date;}):PublicUser{
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
        throw new Error("USER_ALREADY_EXISTS");
    }
    const passwordHash = await bcrypt.hash(password, 12);

    const user = await createUser({
        name: name.trim(),
        email: normalizedEmail,
        password: passwordHash
    });

    return toPublicUser(user);
}

export async function loginUser(email: string, password: string): 
                    Promise<{user: PublicUser; token: string;}>{

    const normalizedEmail = email.toLowerCase().trim();

    const user = await findUserByEmail(normalizedEmail);

    if(!user || !user.password){
        throw new Error("INVALID_CREDENTIALS");
    }
    const passwordMatches = await bcrypt.compare(password, user.password);

    if(!passwordMatches){
        throw new Error("INVALID_CREDENTIALS");
    }
    const token = generateToken(user.id);

    return{
        user: toPublicUser(user),
        token,
    };
}

// this shit migt actually be bugged
// we gotta fix this later
export async function loginWithGoogle(googleId: string, name: string, email: string): Promise<{user: PublicUser; token: string;}>{
    const normalizedEmail = email.toLowerCase().trim();

    let user = await findUserByGoogleId(googleId);
    // existing google account
    if (user) {
        const token = generateToken(user.id);

        return {
            user: toPublicUser(user),
            token,
        };
    }

    /*
        check if this non google user's email already belongs to a TeamSync Account 
    */
    const existingEmailUser = await findUserByEmail(normalizedEmail);

    if (existingEmailUser) {
        throw new Error("EMAIL_ALREADY_REGISTERED");
    }

    /*
        Create a new Google user.
        Google users dont need a password.
    */
    user = await createUser({
        name: name.trim(),
        email: normalizedEmail,
        googleId,
    });

    const token = generateToken(user.id);

    return {
        user: toPublicUser(user),
        token,
    };
}

export async function getUserById(id: string): Promise<PublicUser | null>{
    const user = await findUserById(id);

    if(!user){
        return null;
    }
    return toPublicUser(user);
}

// export const authService = new authService();