import {prisma } from "../library/prisma"
import { Prisma } from "@prisma/client";

// import { User } from "../types/user";
// const users = new Map<string, User>();

export async function createUser(data:{
    name: string;
    email: string;
    username?: string;
    password?: string;
    googleId?: string;
})
{
    try {
        const user = await prisma.user.create({
            data,
        });
        return user;
    } catch (error) {
        // Turn the database's "already exists" error into the clean errors the layers above expect
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
            const target = Array.isArray(error.meta?.target) ? error.meta.target : [];
            if (target.includes("username")) throw new Error("USERNAME_TAKEN");
            if (target.includes("email")) throw new Error("USER_ALREADY_EXISTS");
        }
        throw error;
    }
}

export async function usernameExists(username: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
        where: { username },
        select: { id: true },
    });

    return user !== null;
}

export async function findUserByEmail(email: string){
    
    const user = await prisma.user.findUnique({
        where: { email },
    })

    return user;
}

export async function findUserById(userId: string){
    const user = await prisma.user.findUnique({
        where: {id: userId},
    });

    return user;
}
export async function findUserByGoogleId(googleId: string){
    const user = await prisma.user.findUnique({where: { googleId }});

    return user;
}


// not need anymore now that we using prisma
// export async function userExistsByEmail(email: string): Promise<boolean>{
//     const user = await findUserByEmail(email);

//     return user !== null;
// }


/*
Here all of our prisma connections will be with our database

queries from Prisma to DB is our main goal here


Gotta create basic "Types" folder's items of prisma 

*/