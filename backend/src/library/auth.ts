import "dotenv/config"
export const JWT_SECRET = process.env.JWT_SECRET || "development-secret-change-later";

export const JWT_EXPIRES_IN = "7d";
/*
temporary only for now 
later to be set up in .env
*/