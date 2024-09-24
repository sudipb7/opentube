import { RequestHandler } from "express";

class IndexController {
  public index: RequestHandler = (req, res, next) => {
    try {
      res.sendStatus(200);
    } catch (error) {
      next(error);
    }
  };
}

export default IndexController;
