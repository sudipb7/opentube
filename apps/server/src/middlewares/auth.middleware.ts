import { Request } from "express";
import { User } from "@prisma/client";

import AuthService from "../services/auth.service";
import { decodeToken } from "../utils/auth";
import { apiHandler, ApiResponse } from "../utils/api";

const extractToken = (req: Request) => {
  const fromCookie = req.cookies["accessToken"];
  const fromHeader = req.headers.authorization?.split(" ")[1];
  return fromCookie || fromHeader;
};

const authorize = apiHandler(async (req, res, next) => {
  const authService = new AuthService();
  const accessToken = extractToken(req);

  if (!accessToken) {
    return res.status(401).json(new ApiResponse(401, "Access token missing"));
  }

  let decoded;
  try {
    decoded = decodeToken(accessToken) as Partial<User> | null;
  } catch (error) {
    return res.status(401).json(new ApiResponse(401, "Invalid token"));
  }

  if (!decoded?.email || !decoded?.id) {
    return res.status(401).json(new ApiResponse(401, "Invalid token payload"));
  }

  const user = await authService.findUserById(decoded.id);
  if (!user) {
    return res.status(401).json(new ApiResponse(401, "User not found"));
  }

  req.user = user;
  return next();
});

export default authorize;
