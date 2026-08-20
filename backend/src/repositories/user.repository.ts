import { User } from "../types/user";

const users = new Map<string, User>();

export async function createUser(user: User): Promise<User>{
    users.set(user.id, user);

    return user;
}

export async function findUserByEmail(email: string):Promise<User | null>{
    const normalizedEmail = email.toLowerCase().trim();

    for(const user of users.values()){
        if(user.email === normalizedEmail){
            return user;
        }
    }
    return null;
}

export async function findUserById(id: string): Promise<User | null>{
    return users.get(id) ?? null;
}

export async function userExistsByEmail(email: string): Promise<boolean>{
    const user = await findUserByEmail(email);

    return user !== null;
}