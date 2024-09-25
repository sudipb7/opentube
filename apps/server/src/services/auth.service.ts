import z from "zod";
import { Prisma } from "@prisma/client";

import { db } from "../utils/db";
import { signUpSchema } from "../utils/schemas";
import { generateToken, hashPassword } from "../utils/auth";
import { sendEmailVerificationLink } from "../utils/mail";

class AuthService {
  private db = db;

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
    const hashedPassword = await hashPassword(data.password!);

    const user = await this.db.user.create({ data: { ...data, password: hashedPassword } });
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

    const { name, image, email, id, emailVerified, metaData: rawMetaData } = user;
    const metaData = JSON.parse(rawMetaData?.toString() || "{}");

    const refreshToken = generateToken("REFRESH_TOKEN", { id: user.id });
    const accessToken = generateToken("ACCESS_TOKEN", { id, email, name, image, emailVerified, metaData });

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
