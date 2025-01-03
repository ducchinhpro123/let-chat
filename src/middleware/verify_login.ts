import jwt, { JwtPayload } from 'jsonwebtoken';

import {NextFunction, Request, Response} from 'express';

import * as dotenv from 'dotenv';

dotenv.config(); // Load environment variables


export function verifyLogin(req: Request, res: Response, next: NextFunction) {
  if (!req.cookies) {
    return res.render('authentication_form', { message: 'You have to login first' });
  }

  const token = req.cookies.jwt;
  if (!token) {
    req.flash('loginRequired', 'Please login');
    return res.redirect('/users/authentication');
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not found');
    }

    const decoded: JwtPayload = jwt.verify(token, jwtSecret, {
      algorithms: ['HS256'],
      maxAge: '1h',
    }) as JwtPayload;

    if (typeof decoded === 'undefined') {
      throw new Error('jwt is undefined');
    }

    const tokenExp = decoded.exp! * 1000;
    const fiveMinutes = 5 * 60 * 1000;

    if (tokenExp - Date.now() < fiveMinutes) {
      const newToken = jwt.sign(
        { user_id: decoded.user_id, username: decoded.username },
        jwtSecret,
        { 'expiresIn': '1h' },
      );
      res.cookie('jwt', newToken, {
        httpOnly: true,
        maxAge: 3600000,
        sameSite: 'strict',
      });
    }

    req.user = {
      id: decoded.user_id,
      username: decoded.username,
    };

    return next();

  } catch (e) {
    console.error(e);
    res.clearCookie('jwt');
    return res.render('authentication_form', { 
      message: 'Cookies is wrong' 
    });
  }
}
