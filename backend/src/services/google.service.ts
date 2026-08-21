import { google } from "googleapis";
import { googleOAuth2Client } from "../library/google";

// this is just a basic google auth url command 
export function getGoogleAuthUrl(): string{
    return googleOAuth2Client.generateAuthUrl({
        access_type: "online",
        scope:[
            "openid",
            "email",
            "profile"
        ],
        prompt: "select_account",
    });
};

export async function getGoogleUser(code: string){
    const { tokens } = await googleOAuth2Client.getToken(code);

    googleOAuth2Client.setCredentials(tokens);

    if(!tokens.id_token){
        throw new Error("GOOGLE_ID_TOKEN_MISSING");
    }

    const ticket = await googleOAuth2Client.verifyIdToken({
        idToken: tokens.id_token,
        audience: process.env.GOOGLE_CLIENT_ID ?? "YOUR_GOOGLE_CLIENT_ID",
    });

    const payload = ticket.getPayload();

    if(!payload){
        throw new Error("GOOGLE_USER_DATA_MISSING");
    }
    if(!payload.sub || !payload.email){
        throw new Error("GOOGLE_USER_DATA_INCOMPLETE");
    } 
    return{
        googleId: payload.sub,
        email: payload.email,
        name: payload.name ?? payload.email.split("@")[0],
    };
}