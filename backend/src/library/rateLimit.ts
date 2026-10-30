import rateLimit from "express-rate-limit";

// Test runs make hundreds of requests from one IP in seconds
const skipInTests = () => process.env.NODE_ENV === "test";

// General limit for the whole API, counted per IP address.
// Generous on purpose: a team on one Wi-Fi network shares a single IP.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 600,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests, please slow down" },
});

// Strict limit for login/register. Only FAILED attempts count
// (skipSuccessfulRequests), so honest users never notice it,
// but password guessing stops after 20 tries per 15 minutes.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  skipSuccessfulRequests: true,
  skip: skipInTests,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts, please try again in a few minutes" },
});