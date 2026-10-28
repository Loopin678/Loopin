import "dotenv/config";

const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

function getGitHubConfig() {
     const clientId = process.env.GITHUB_CLIENT_ID;
     const clientSecret = process.env.GITHUB_CLIENT_SECRET;
     const redirectUrl = process.env.GITHUB_REDIRECT_URL;

     if(!clientId || !clientSecret || !redirectUrl){
          throw new Error("GITHUB_OAUTH_CONFIG_MISSING");
     }

     return { clientId, clientSecret, redirectUrl };
}

export function getGitHubAuthUrl(state: string): string {
     const { clientId, redirectUrl } = getGitHubConfig();

     const url = new URL(GITHUB_AUTHORIZE_URL);

     url.searchParams.set("client_id", clientId);
     url.searchParams.set("redirect_url", redirectUrl);
     url.searchParams.set("scope", "read:user user:email");
     url.searchParams.set("state", state);

     return url.toString();
}

type GitHubProfile={
     id: number;
     login: string;
     name: string | null;
     html_url: string;
};

type GitHubEmail={
     email: string;
     primary: boolean;
     verified: boolean;
};

export async function getGitHubUser(code: string) {
     const { clientId, clientSecret } = getGitHubConfig();

     const tokenResponse = await fetch(
          "https://github.com/login/oauth/access_token",
     {
          method: "POST",
          headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          },
          body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          }),
     }
     );

     if(!tokenResponse.ok){
          throw new Error("GITHUB_TOKEN_EXCHANGE_FAILED");
     }

     const tokenData = (await tokenResponse.json()) as {
          access_token?: string;
          error?: string;
     };

     if(!tokenData.access_token)   {
          throw new Error("GITHUB_TOKEN_EXCHANGE_FAILED");
     }

     const headers = {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
               "X-GitHub-Api-Version": "2022-11-28",
     };

     const profileResponse = await fetch("https://api.github.com/user", {
     headers,
     });

     if(!profileResponse.ok){
          throw new Error("GITHUB_PROFILE_FETCH_FAILED");
     }

     const profile = (await profileResponse.json()) as GitHubProfile;

     const emailsResponse = await fetch(
          "https://api.github.com/user/emails",
          { headers }
     );

     if(!emailsResponse.ok){
          throw new Error("GITHUB_EMAIL_FETCH_FAILED");
     }

     const emails = (await emailsResponse.json()) as GitHubEmail[];

     const verifiedEmail =
          emails.find((email) => email.primary && email.verified) ??
          emails.find((email) => email.verified);

     if(!verifiedEmail){
          throw new Error("GITHUB_VERIFIED_EMAIL_REQUIRED");
     }  

     return {
          githubId: String(profile.id),
          githubUsername: profile.login,
          githubUrl: profile.html_url,
          name: profile.name?.trim() || profile.login,
          email: verifiedEmail.email.toLowerCase().trim(),
     };
}