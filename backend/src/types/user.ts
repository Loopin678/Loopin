export type AuthProvider = "local" | "google";

export type User ={
    id: string;
    name: string;
    email: string;
    passwordHash?: string;
    provider: AuthProvider;

    createdAt: Date;
    googleId?: string;
};

/*
This representation is temporary so far and this will be updated with the confirmed prisma schema
*/