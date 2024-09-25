import { User } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      user?: Partial<User>;
    }
  }
}

// This empty export is necessary to make this a module
export {};
