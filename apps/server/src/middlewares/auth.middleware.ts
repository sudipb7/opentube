import { User } from "@prisma/client";

import AuthService from "../services/auth.service";
import { decodeToken } from "../utils/auth";
import { apiHandler, ApiResponse } from "../utils/api";

const authorize = apiHandler(async (req, res, next) => {
  const authService = new AuthService();
  const accessToken = req.cookies["accessToken"] || req.headers.authorization?.split(" ")[1];

  if (!accessToken) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized"));
  }

  const decoded = decodeToken(accessToken) as Partial<User> | null;
  if (!decoded || !decoded.email || !decoded.id) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized"));
  }

  const user = await authService.findUserById(decoded.id);
  if (!user) {
    return res.status(401).json(new ApiResponse(401, "Unauthorized"));
  }

  req.user = decoded;
  return next();
});

export default authorize;
