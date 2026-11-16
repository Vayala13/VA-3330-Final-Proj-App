import crypto from "node:crypto";
import helmet from "helmet";
import session from "express-session";

const SAFE_METHODS = ["GET", "HEAD", "OPTIONS"];

export const securityHeaders = helmet();

// Without SESSION_SECRET, a random secret is used, so everyone is signed out whenever the server restarts.
export const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex"),
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
});

const tokensMatch = (sent, expected) => {
  if (typeof sent !== "string" || sent.length !== expected.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(sent), Buffer.from(expected));
};

// Every form that changes data must include: <%- include("partials/csrf.ejs") %>
export const csrfProtection = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;

  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  const sentToken = req.body?._csrf || req.get("x-csrf-token");
  if (!tokensMatch(sentToken, req.session.csrfToken)) {
    const error = new Error("Your form expired. Go back, refresh the page, and try again.");
    error.status = 403;
    return next(error);
  }

  next();
};
