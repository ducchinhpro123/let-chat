import { Request, Response } from "express";
import { IUser, User } from "../models";
import mongoose from "mongoose";

interface RequestUser {
  _id: string | mongoose.Types.ObjectId,
  username: string,
}

declare global {
  namespace Express {
    interface Request {
      user?: RequestUser;
    }
  }
}

class IndexController {
  static async index(req: Request, res: Response) {
    const user = req.user;
    return res.render("index", { user: user });
  }
}

export default IndexController;
