import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { User } from "@prisma/client";

import { JWT_SECRET_KEY } from "../config";

enum TOKEN_EXPIRATION {
  REFRESH_TOKEN = "7d",
  ACCESS_TOKEN = "15m",
  EMAIL_VERIFICATION = "5m",
}

const generateToken = (type: keyof typeof TOKEN_EXPIRATION, payload: Partial<User>): string | null => {
  try {
    return jwt.sign(payload, JWT_SECRET_KEY!, { expiresIn: TOKEN_EXPIRATION[type] });
  } catch (error) {
    return null;
  }
};

const decodeToken = (token: string): string | jwt.JwtPayload | null => {
  try {
    return jwt.verify(token, JWT_SECRET_KEY!);
  } catch (error) {
    return null;
  }
};

const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(15);
  const hash = await bcrypt.hash(password, salt);
  return hash;
};

const comparePassword = async (password: string, hashedPassword: string): Promise<boolean> => {
  const isValidPassword = await bcrypt.compare(password, hashedPassword);
  return isValidPassword;
};

export { generateToken, decodeToken, hashPassword, comparePassword, TOKEN_EXPIRATION };
