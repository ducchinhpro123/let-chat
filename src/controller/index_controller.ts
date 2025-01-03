import { Request, Response } from 'express';
import { User } from '../models';

declare module 'express' {
  interface Request {
    user?: typeof User;
  }
}

class IndexController {
  static async index(req: Request , res: Response) {
    const user = req.user;
    return res.render('index', { user: user });
  }
}

export default IndexController;
