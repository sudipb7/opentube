import { Router } from "express";
import { Routes } from "../types/common";
import AuthController from "../controllers/auth.controller";
import authorize from "../middlewares/auth.middleware";

class AuthRoute implements Routes {
  public path = "/auth";
  public router: Router = Router();
  private controller = new AuthController();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes() {
    this.router.get(`${this.path}/google`, this.controller.signInWithGoogle);
    this.router.get(`${this.path}/github`, this.controller.signInWithGithub);
    this.router.get(`${this.path}/callback/google`, this.controller.signInWithGoogleCallback);
    this.router.get(`${this.path}/callback/github`, this.controller.signInWithGithubCallback);
    this.router.post(`${this.path}/sign-up`, this.controller.signUp);
    this.router.post(`${this.path}/sign-in`, this.controller.signIn);
    this.router.post(`${this.path}/verify-email`, this.controller.verifyEmail);
    this.router.post(`${this.path}/sign-out`, authorize, this.controller.signOut);
    this.router.post(`${this.path}/refresh-token`, this.controller.refreshToken);
  }
}

export default AuthRoute;
