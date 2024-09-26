import axios from "axios";
import { Prisma } from "@prisma/client";

import { db } from "../utils/db";
import { generateToken, hashPassword } from "../utils/auth";
import { sendEmailVerificationLink } from "../utils/mail";
import { OAuthConfig, OAuthProfile } from "../types/auth";
import { APP_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "../config";

class AuthService {
  private db = db;

  public oauthConfigs: { [key: string]: OAuthConfig } = {
    google: {
      authUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      userInfoUrl: "https://www.googleapis.com/oauth2/v2/userinfo",
      clientId: GOOGLE_CLIENT_ID!,
      clientSecret: GOOGLE_CLIENT_SECRET!,
      redirectUri: `${APP_URL}/v1/auth/callback/google`,
      scope: "https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email",
    },
    github: {
      authUrl: "https://github.com/login/oauth/authorize",
      tokenUrl: "https://github.com/login/oauth/access_token",
      userInfoUrl: "https://api.github.com/user",
      clientId: GITHUB_CLIENT_ID!,
      clientSecret: GITHUB_CLIENT_SECRET!,
      redirectUri: `${APP_URL}/v1/auth/callback/github`,
      scope: "user:email",
    },
  };

  public async getUserOauthProfile(provider: "google" | "github", accessToken: string): Promise<OAuthProfile> {
    const config = this.oauthConfigs[provider];
    const { data: profile } = await axios.get(config.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (provider === "github" && !profile.email) {
      const { data: emails } = await axios.get("https://api.github.com/user/emails", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      profile.email = emails.find((email: any) => email.primary)?.email;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      picture: provider === "google" ? profile.picture : profile.avatar_url,
    };
  }

  public async updateExistingUserWithOauth(existingUser: any, profile: OAuthProfile, provider: "google" | "github") {
    await this.updateUser(existingUser.id, {
      metaData: { ...existingUser.metaData, [`${provider}Id`]: profile.id },
      ...(existingUser.emailVerified ? {} : { emailVerified: new Date() }),
      ...(existingUser.image ? {} : { image: profile.picture }),
      ...(existingUser.name ? {} : { name: profile.name }),
    });
  }

  public async createNewUserFromOauth(profile: OAuthProfile, provider: "google" | "github") {
    return await this.createUser({
      name: profile.name || "",
      email: profile.email,
      metaData: { [`${provider}Id`]: profile.id },
      image: profile.picture,
      emailVerified: new Date(),
    });
  }

  public findUserByEmail = async (email: string, include?: Prisma.UserInclude, select?: Prisma.UserSelect) => {
    let filters;
    if (include) {
      filters = { include };
    }

    if (select) {
      filters = { select };
    }

    return this.db.user.findUnique({ where: { email }, ...filters });
  };

  public findUserById = async (id: string, include?: Prisma.UserInclude, select?: Prisma.UserSelect) => {
    let filters;
    if (include) {
      filters = { include };
    }

    if (select) {
      filters = { select };
    }

    return this.db.user.findUnique({ where: { id }, ...filters });
  };

  public createUser = async (data: Prisma.UserCreateInput) => {
    const user = await this.db.user.create({
      data: { ...data, ...(data.password ? { password: await hashPassword(data.password) } : { password: null }) },
    });

    if (!user) {
      throw new Error("[AuthService:createUser] => Error creating user");
    }

    return user;
  };

  public sendEmailVerificationLink = async (email: string) => {
    const token = generateToken("EMAIL_VERIFICATION", { email });
    if (!token) {
      throw new Error("[AuthService:sendEmailVerificationLink] => Error generating token");
    }

    const res = await sendEmailVerificationLink(email, token);
    if (!res) {
      throw new Error("[AuthService:sendEmailVerificationLink] => Error sending email");
    }

    return true;
  };

  public generateTokens = async (userId: string) => {
    const user = await this.findUserById(userId);
    if (!user) {
      throw new Error("[AuthService:generateTokens] => User not found");
    }

    const { name, image, email, id, emailVerified, metaData } = user;

    const refreshToken = generateToken("REFRESH_TOKEN", { id: user.id });
    const accessToken = generateToken("ACCESS_TOKEN", {
      id,
      email,
      name,
      image,
      emailVerified,
      metaData: metaData,
    });

    if (!refreshToken || !accessToken) {
      throw new Error("[AuthService:generateTokens] => Error generating tokens");
    }

    const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const accessTokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

    return { refreshToken, refreshTokenExpiry, accessToken, accessTokenExpiry };
  };

  public updateUser = async (id: string, data: Prisma.UserUpdateInput) => {
    return this.db.user.update({ where: { id }, data });
  };
}

export default AuthService;
