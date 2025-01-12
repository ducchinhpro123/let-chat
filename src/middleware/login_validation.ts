import { body, validationResult } from 'express-validator';
import {NextFunction, Request, Response} from 'express';

export const loginValidation = [
  body('username') 
  .trim()
  .notEmpty()
  .withMessage('username is required')
  .matches(/^[a-zA-Z0-9_]+$/)
  .withMessage('username can only contain letters, numbers and underscores')
  .isLength({ min: 4 })
  .withMessage('username must be at least 4 characters long')
  .escape(),

  body('password')
  .trim()
  .notEmpty()
  .withMessage('Password is required')
  .isLength({ min: 5 })
  .withMessage('password must be at least 5 characters long'),

  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.render('authentication_form', {
        message: errors.array()[0].msg,
        oldInput: {
          username: req.body.username
        }
      });
    }
    next();
  }
]
