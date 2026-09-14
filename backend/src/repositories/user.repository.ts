import {prisma } from "../library/prisma"

// import { User } from "../types/user";
// const users = new Map<string, User>();

export async function createUser(data:{
    name: string;
    email: string;
    password?: string;
    googleId?: string;
})
{
    
    const user = await prisma.user.create({
        data,
    });
    return user;
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