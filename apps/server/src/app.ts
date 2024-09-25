import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import cookieParser from "cookie-parser";

import { Routes } from "./types/common";
import { CORS_ORIGINS, LOG_FORMAT, NODE_ENV, PORT } from "./config";
import { logger, stream } from "./utils/logger";

class App {
  public app: express.Application;
  public env: string;
  public port: string | number;
  private origins: string[];

  constructor(routes: Routes[]) {
    this.app = express();
    this.env = NODE_ENV || "development";
    this.port = PORT || 8000;
    this.origins = CORS_ORIGINS?.split(",") || [];

    this.initializeMiddlewares();
    this.initializeRoutes(routes);
  }

  public listen() {
    this.app.listen(this.port, () => {
      logger.info(`=================================`);
      logger.info(`======= ENV: ${this.env} =======`);
      logger.info(`🚀 App listening on the port ${this.port}`);
      logger.info(`=================================`);
    });
  }

  public getServer() {
    return this.app;
  }

  private initializeMiddlewares() {
    this.app.use(cors({ origin: this.origins, credentials: true }));
    this.app.use(morgan(LOG_FORMAT!, { stream }));
    this.app.use(helmet());
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "50mb" }));
    this.app.use(cookieParser());
    this.app.use(express.static("public"));
  }

  private initializeRoutes(routes: Routes[]) {
    routes.forEach(route => {
      this.app.use("/v1", route.router);
    });
  }
}

export default App;
