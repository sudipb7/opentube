interface OAuthConfig {
  authUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope: string;
}

interface OAuthProfile {
  id: string;
  email: string;
  name?: string;
  picture?: string;
}

export type { OAuthConfig, OAuthProfile };
