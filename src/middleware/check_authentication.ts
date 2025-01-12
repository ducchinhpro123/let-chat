import jwt, { JwtPayload } from "jsonwebtoken";
import { NextFunction, Request, Response } from "express";
import { Model, Document, ObjectId } from "mongoose";

import { IUser } from "../models";

import * as dotenv from "dotenv";

dotenv.config(); // Load environment variables

/* Middleware to check if a user is already logged in */
export function checkAuthentication(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const token = req.cookies.jwt;
  // Have no token (No logged yet)
  if (!token) {
    return next();
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      throw new Error("JWT_SECRET is not found");
    }
    const decodedToken = jwt.verify(token, jwtSecret) as any;
    req.user = decodedToken;
    // If authenticated user try to access these paths. Redirect to home page
    if (req.path === "/login" || req.path === "/register") {
      return res.redirect("/");
    }
    return next();
  } catch (e) {
    res.clearCookie("jwt");
    return next();
  }
}
