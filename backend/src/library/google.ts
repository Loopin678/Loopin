import google from "googleapis";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
//"YOUR_GOOGLE_CLIENT_ID";

export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GOOGLE_REDIRECT_URL = "http://localhost:4000/api/auth/google/callback";

export const googleOAuth2Client = new google.Auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL
);