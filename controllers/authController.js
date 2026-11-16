import passport from "passport";
import { getAllUsers, DEMO_PASSWORD } from "../services/userService.js";

const demoAccounts = () =>
  process.env.NODE_ENV === "production"
    ? null
    : { password: DEMO_PASSWORD, users: getAllUsers().map(({ name, email, role }) => ({ name, email, role })) };

export function showLogin(req, res, next) {
  try {
    if (req.isAuthenticated()) {
      return res.redirect("/");
    }
    res.render("login.ejs", { title: "Log in", demoAccounts: demoAccounts() });
  } catch (error) {
    next(error);
  }
}

export function login(req, res, next) {
  passport.authenticate("local", (error, user, info) => {
    if (error) {
      return next(error);
    }
    if (!user) {
      return res.status(401).render("login.ejs", {
        title: "Log in",
        error: info?.message || "Email or password is incorrect.",
        email: req.body.email,
        demoAccounts: demoAccounts()
      });
    }
    req.login(user, (loginError) => {
      if (loginError) {
        return next(loginError);
      }
      res.redirect("/");
    });
  })(req, res, next);
}

export function logout(req, res, next) {
  req.logout((error) => {
    if (error) {
      return next(error);
    }
    res.redirect("/login");
  });
}
