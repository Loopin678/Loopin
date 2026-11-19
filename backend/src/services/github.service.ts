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
          accessToken: tokenData.access_token,

     };
}

export async function fetchGitHubRepositories(accessToken: string) {
    const repositories: Array<{
        id: number;
        name: string;
        full_name: string;
        private: boolean;
        html_url: string;
        description: string | null;
        language: string | null;
        stargazers_count: number;
        forks_count: number;
        updated_at: string;
    }> = [];

    const perPage = 100;
    let page = 1;
    const maxPages = 50;

    while (page <= maxPages) {
        const response = await fetch(
            `https://api.github.com/user/repos?visibility=public&sort=updated&per_page=${perPage}&page=${page}`,
            {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    Accept: "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
            }
        );

        if (response.status === 401) {
            throw new Error("GITHUB_TOKEN_INVALID");
        }

        if (response.status === 403 || response.status === 429) {
            const remaining = response.headers.get("x-ratelimit-remaining");
            const reset = response.headers.get("x-ratelimit-reset");

            if (
                response.status === 429 ||
                remaining === "0"
            ) {
                throw new Error(
                    `GITHUB_RATE_LIMIT_EXCEEDED:${reset ?? "unknown"}`
                );
            }

            throw new Error("GITHUB_API_FORBIDDEN");
        }

        if (!response.ok) {
            throw new Error("GITHUB_REPOSITORY_FETCH_FAILED");
        }

        const currentPage = await response.json() as typeof repositories;

        repositories.push(...currentPage);

        if (currentPage.length < perPage) {
            break;
        }

        page++;
    }

    if (page > maxPages && repositories.length === maxPages * perPage) {
        throw new Error("GITHUB_PAGINATION_LIMIT_REACHED");
    }

    return repositories.map((repo) => ({
        id: repo.id,
        name: repo.name,
        fullName: repo.full_name,
        isPrivate: repo.private,
        url: repo.html_url,
        description: repo.description,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at,
    }));
}
