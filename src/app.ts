import createError from "http-errors";
import express, {
  json,
  urlencoded,
  Express,
  Request,
  Response,
  NextFunction,
} from "express";

import { join, dirname } from "path";
import cookieParser from "cookie-parser";
import logger from "morgan";
import { fileURLToPath } from "url";
import * as dotenv from "dotenv";

import { configServer } from "./config/config_server.js";
import { connectMongodb } from "./config/config_mongodb.js";
import session from "express-session";
import flash from "connect-flash";

import indexRouter from "./routes/index";
import usersRouter from "./routes/users";

interface ExpressError extends Error {
  status?: number;
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    isAuthenticated?: boolean;
  }
}

dotenv.config(); // Load environment variables

const app = express();

const __filename: string = fileURLToPath(import.meta.url);
const __dirname: string = dirname(fileURLToPath(import.meta.url));

connectMongodb();

// view engine setup
//
app.set("views", join(__dirname, "views"));

//app.use('/tinymce', express.static(join(__dirname, 'node_modules', 'tinymce')));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "No secret", // Ensure SESSION_SECRET is set in your .env file
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 24h
    },
  }),
);

app.use(flash());

app.set("view engine", "ejs");

app.use(logger("dev"));
app.use(json());
app.use(urlencoded({ extended: false }));
app.use(cookieParser());

// app.use(authenticateToken);

// app.use(express.static(join(__dirname, "public")));
app.use(express.static(join(__dirname, "public")));

app.use("/", indexRouter);
app.use("/users", usersRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (
  err: ExpressError,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render("error");
});

configServer(app);

export default app;
