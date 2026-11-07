import {createCipheriv,createDecipheriv,randomBytes} from "crypto";

function getEncryptionKey(): Buffer{
     const key = process.env.GITHUB_TOKEN_ENCRYPTION_KEY;

     if(!key){
        throw new Error("GITHUB_TOKEN_ENCRYPTION_KEY_MISSING");
     }

    const keyBuffer = Buffer.from(key, "base64");

     if(keyBuffer.length !== 32){
         throw new Error("INVALID_GITHUB_TOKEN_ENCRYPTION_KEY");
     }

    return keyBuffer;
}

export function encryptGitHubToken(token: string): string {
    const iv = randomBytes(12);

     const cipher = createCipheriv("aes-256-gcm",getEncryptionKey(),iv);

     const encrypted = Buffer.concat([
        cipher.update(token, "utf8"),
        cipher.final(),
     ]);

     const authTag = cipher.getAuthTag();

     return[
         iv.toString("base64"),
         authTag.toString("base64"),
         encrypted.toString("base64"),
     ].join(":");
}

export function decryptGitHubToken(encryptedToken: string): string {
    const [iv, authTag, encrypted] = encryptedToken
        .split(":")
        .map((part) => Buffer.from(part, "base64"));

    if (!iv || !authTag || !encrypted || iv.length !== 12 || authTag.length !== 16) {
        throw new Error("INVALID_ENCRYPTED_GITHUB_TOKEN");
    }

    const decipher = createDecipheriv(
        "aes-256-gcm",
        getEncryptionKey(),
        iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
    ]);

    return decrypted.toString("utf8");
}