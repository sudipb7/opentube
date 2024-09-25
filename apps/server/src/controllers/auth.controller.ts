import AuthService from "../services/auth.service";
import { apiHandler, ApiResponse } from "../utils/api";
import { comparePassword, decodeToken } from "../utils/auth";
import { signUpSchema, throwZodError, signInSchema } from "../utils/schemas";

class AuthController {
  private authService = new AuthService();

  public signUp = apiHandler(async (req, res) => {
    const validated = signUpSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json(new ApiResponse(400, throwZodError(validated.error)));
    }

    const { email, name, password } = validated.data;

    const existingUser = await this.authService.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json(new ApiResponse(400, "Email already in use"));
    }

    const user = await this.authService.createUser({ email, name, password, metaData: {} });

    const result = await this.authService.sendEmailVerificationLink(user.email);
    if (!result) {
      return res.status(500).json(new ApiResponse(500, "Error sending email verification link"));
    }

    res.status(201).send("Check your email for verification link");
  });

  public signIn = apiHandler(async (req, res) => {
    const validated = signInSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json(new ApiResponse(400, throwZodError(validated.error)));
    }

    const { email, password } = validated.data;

    const existingUser = await this.authService.findUserByEmail(email);
    if (!existingUser) {
      return res.status(400).json(new ApiResponse(400, "Invalid email or password"));
    }

    if (existingUser && !existingUser.emailVerified) {
      const result = await this.authService.sendEmailVerificationLink(existingUser.email);
      if (!result) {
        return res.status(500).json(new ApiResponse(500, "Error sending email verification link"));
      }

      return res.status(200).json(new ApiResponse(200, "Verification link sent to email"));
    }

    if (existingUser.password) {
      const isValidPassword = await comparePassword(password, existingUser.password);
      if (!isValidPassword) {
        return res.status(400).json(new ApiResponse(400, "Invalid email or password"));
      }

      const { accessToken, accessTokenExpiry, refreshToken, refreshTokenExpiry } =
        await this.authService.generateTokens(existingUser.id);

      return res
        .status(200)
        .cookie("refreshToken", refreshToken, { httpOnly: true, expires: refreshTokenExpiry })
        .cookie("accessToken", accessToken, { httpOnly: true, expires: accessTokenExpiry })
        .json(new ApiResponse(200, "User logged in successfully"));
    } else {
      // OAuth scenario
      // To be implemented later
      return res.status(400).json(new ApiResponse(400, "Password not set"));
    }
  });

  public verifyEmail = apiHandler(async (req, res) => {
    const token = req.body.token;
    if (!token) {
      return res.status(400).json(new ApiResponse(400, "Invalid token"));
    }

    const decoded = decodeToken(token) as { email: string } | null;
    if (!decoded) {
      return res.status(400).json(new ApiResponse(400, "Invalid token"));
    }

    const existingUser = await this.authService.findUserByEmail(decoded.email);
    if (!existingUser) {
      return res.status(400).json(new ApiResponse(400, "Invalid token"));
    }

    if (existingUser.emailVerified) {
      return res.status(400).json(new ApiResponse(400, "Email already verified"));
    }

    await this.authService.updateUser(existingUser.id, { emailVerified: new Date() });

    const { accessToken, accessTokenExpiry, refreshToken, refreshTokenExpiry } = await this.authService.generateTokens(
      existingUser.id
    );

    return res
      .status(200)
      .cookie("refreshToken", refreshToken, { httpOnly: true, expires: refreshTokenExpiry })
      .cookie("accessToken", accessToken, { httpOnly: true, expires: accessTokenExpiry })
      .json(new ApiResponse(200, "User logged in successfully"));
  });

  public signOut = apiHandler(async (req, res) => {
    const id = req.user?.id;
    if (!id) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    return res
      .status(200)
      .clearCookie("refreshToken")
      .clearCookie("accessToken")
      .json(new ApiResponse(200, "User logged out"));
  });

  public refreshToken = apiHandler(async (req, res) => {
    const refreshToken = req.cookies["refreshToken"];
    if (!refreshToken) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    const decoded = decodeToken(refreshToken) as { id: string } | null;
    if (!decoded || !decoded.id) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    const user = await this.authService.findUserById(decoded.id);
    if (!user) {
      return res.status(401).json(new ApiResponse(401, "Unauthorized"));
    }

    const {
      accessToken,
      accessTokenExpiry,
      refreshToken: newRefreshToken,
      refreshTokenExpiry,
    } = await this.authService.generateTokens(user.id);

    return res
      .status(200)
      .cookie("refreshToken", newRefreshToken, { httpOnly: true, expires: refreshTokenExpiry })
      .cookie("accessToken", accessToken, { httpOnly: true, expires: accessTokenExpiry })
      .json(new ApiResponse(200, "Token refreshed successfully"));
  });
}

export default AuthController;
