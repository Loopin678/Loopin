import "dotenv/config"

const DEV_FALLBACK_SECRET = "development-secret-change-later";

// Anyone who knows the secret can forge any user's login, so the public
// fallback in this file is only acceptable for local development.
if (process.env.NODE_ENV === "production" && (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_FALLBACK_SECRET)) {
  throw new Error("JWT_SECRET must be set to a long random value when NODE_ENV=production");
}

export const JWT_SECRET = process.env.JWT_SECRET || DEV_FALLBACK_SECRET;

export const JWT_EXPIRES_IN = "7d";
