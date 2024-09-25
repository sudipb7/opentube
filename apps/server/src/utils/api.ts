import { NextFunction, Request, RequestHandler, Response } from "express";
import { logger } from "./logger";

class ApiResponse<T> {
  public status: number;
  public message: string;
  public data?: T;

  constructor(status: number, message: string, data?: T) {
    this.status = status;
    this.message = message;
    this.data = data;
  }
}

function apiHandler(handler: RequestHandler): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await handler(req, res, next);
    } catch (err: any) {
      logger.error(`[${req.method}: ${req.originalUrl}] >> ${err.message}`);
      return res.status(500).json(new ApiResponse(500, err.message));
    }
  };
}

export { ApiResponse, apiHandler };
