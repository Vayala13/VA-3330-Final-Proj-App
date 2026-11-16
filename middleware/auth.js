import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import rateLimit from "express-rate-limit";
import { verifyCredentials, findUserById } from "../services/userService.js";

passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await verifyCredentials(email, password);
      if (!user) {
        return done(null, false, { message: "Email or password is incorrect." });
      }
      return done(null, user);
    } catch (error) {
      return done(error);
    }
  })
);

passport.serializeUser((user, done) => done(null, user.userId));

passport.deserializeUser((userId, done) => {
  try {
    done(null, findUserById(userId) || false);
  } catch (error) {
    done(error);
  }
});

export const passportInitialize = passport.initialize();
export const passportSession = passport.session();

export const exposeCurrentUser = (req, res, next) => {
  res.locals.currentUser = req.user || null;
  next();
};

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res, next, options) => {
    const error = new Error("Too many failed login attempts. Wait 15 minutes and try again.");
    error.status = options.statusCode;
    next(error);
  }
});
