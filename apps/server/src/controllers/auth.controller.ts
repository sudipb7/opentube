import axios from "axios";
import { ZodSchema } from "zod";
import { User } from "@prisma/client";
import { Response, Request } from "express";

import AuthService from "../services/auth.service";
import { CORS_ORIGINS } from "../config";
import { apiHandler, ApiResponse } from "../utils/api";
import { comparePassword, decodeToken } from "../utils/auth";
import { signUpSchema, signInSchema, SignUpInput, SignInInput, handleValidation } from "../utils/schemas";

class AuthController {
  private authService = new AuthService();

  private async setAuthCookies(res: any, userId: string) {
    const { accessToken, accessTokenExpiry, refreshToken, refreshTokenExpiry } =
      await this.authService.generateTokens(userId);

    res.cookie("refreshToken", refreshToken, { httpOnly: true, expires: refreshTokenExpiry });
    res.cookie("accessToken", accessToken, { httpOnly: true, expires: accessTokenExpiry });
  }

  private signInWithOauth = (req: Request, res: Response, provider: "google" | "github") => {
    const config = this.authService.oauthConfigs[provider];
    const options = {
      redirect_uri: config.redirectUri,
      client_id: config.clientId,
      scope: config.scope,
      ...(provider === "google" ? { access_type: "offline", response_type: "code", prompt: "consent" } : {}),
    };
    const qs = new URLSearchParams(options);
    return res.redirect(`${config.authUrl}?${qs.toString()}`);
  };

  private signInWithOauthCallback = async (req: Request, res: Response, provider: "google" | "github") => {
    const { code } = req.query;
    const config = this.authService.oauthConfigs[provider];

    const { data: tokenData } = await axios.post(
      config.tokenUrl,
      {
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: config.redirectUri,
        ...(provider === "google" ? { grant_type: "authorization_code" } : {}),
      },
      {
        headers: { Accept: "application/json" },
      }
    );

    const profile = await this.authService.getUserOauthProfile(provider, tokenData.access_token);

    if (!profile.email) {
      return res.status(400).json(new ApiResponse(400, "Failed to Sign In"));
    }

    let newUser;
    const existingUser = await this.authService.findUserByEmail(profile.email);
    if (existingUser) {
      await this.authService.updateExistingUserWithOauth(existingUser, profile, provider);
    } else {
      newUser = await this.authService.createNewUserFromOauth(profile, provider);
    }

    await this.setAuthCookies(res, existingUser ? existingUser.id : (newUser as User).id);

    return res.redirect(`${CORS_ORIGINS?.split(",")[0]}`);
  };

  public signInWithGoogle = apiHandler(async (req, res) => {
    return this.signInWithOauth(req, res, "google");
  });

  public signInWithGithub = apiHandler(async (req, res) => {
    return this.signInWithOauth(req, res, "github");
  });

  public signInWithGoogleCallback = apiHandler(async (req, res) => {
    return this.signInWithOauthCallback(req, res, "google");
  });

  public signInWithGithubCallback = apiHandler(async (req, res) => {
    return this.signInWithOauthCallback(req, res, "github");
  });

  public signUp = apiHandler(async (req, res) => {
    const validation = handleValidation<SignUpInput>(signUpSchema, req.body);
    if (validation.error || !validation.data) {
      return res.status(400).json(validation.error);
    }

    const { email, name, password } = validation.data;

    if (await this.authService.findUserByEmail(email)) {
      return res.status(400).json(new ApiResponse(400, "Email already in use"));
    }

    const user = await this.authService.createUser({ email, name, password });

    if (!(await this.authService.sendEmailVerificationLink(user.email))) {
      return res.status(500).json(new ApiResponse(500, "Error sending email verification link"));
    }

    return res.status(201).json(new ApiResponse(201, "Check your email for verification link"));
  });

  public signIn = apiHandler(async (req, res) => {
    const validation = handleValidation<SignInInput>(signInSchema, req.body);
    if (validation.error || !validation.data) {
      return res.status(400).json(validation.error);
    }

    const { email, password } = validation.data;

    const user = await this.authService.findUserByEmail(email);
    if (!user) {
      return res.status(400).json(new ApiResponse(400, "Invalid email or password"));
    }

    if (!user.emailVerified) {
      if (!(await this.authService.sendEmailVerificationLink(user.email))) {
        return res.status(500).json(new ApiResponse(500, "Error sending email verification link"));
      }
      return res.status(200).json(new ApiResponse(200, "Verification link sent to email"));
    }

    if (!user.password || !(await comparePassword(password, user.password))) {
      return res.status(400).json(new ApiResponse(400, "Invalid email or password"));
    }

    await this.setAuthCookies(res, user.id);
    return res.status(200).json(new ApiResponse(200, "User logged in successfully"));
  });

  public verifyEmail = apiHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json(new ApiResponse(400, "Invalid token"));
    }

    const decoded = decodeToken(token) as { email: string } | null;
    if (!decoded || !decoded.email) {
      return res.status(400).json(new ApiResponse(400, "Invalid token"));
    }

    const user = await this.authService.findUserByEmail(decoded.email);
    if (!user) {
      return res.status(400).json(new ApiResponse(400, "Invalid token"));
    }

    if (user.emailVerified) {
      return res.status(400).json(new ApiResponse(400, "Email already verified"));
    }

    await this.authService.updateUser(user.id, { emailVerified: new Date() });
    await this.setAuthCookies(res, user.id);
    return res.status(200).json(new ApiResponse(200, "User logged in successfully"));
  });

  public signOut = apiHandler(async (req, res) => {
    if (!req.user?.id) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    res.clearCookie("refreshToken").clearCookie("accessToken");
    return res.status(200).json(new ApiResponse(200, "User logged out"));
  });

  public refreshToken = apiHandler(async (req, res) => {
    const refreshToken = req.cookies["refreshToken"];
    if (!refreshToken) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    const decoded = decodeToken(refreshToken) as { id: string } | null;
    if (!decoded?.id) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    const user = await this.authService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    await this.setAuthCookies(res, user.id);
    return res.status(200).json(new ApiResponse(200, "Token refreshed successfully"));
  });
}

export default AuthController;
