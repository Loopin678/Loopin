import "dotenv/config"
import {google} from "googleapis";

export const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
//"YOUR_GOOGLE_CLIENT_ID";

export const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

export const GOOGLE_REDIRECT_URL = process.env.GOOGLE_REDIRECT_URL!;

export const googleOAuth2Client = new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URL
);