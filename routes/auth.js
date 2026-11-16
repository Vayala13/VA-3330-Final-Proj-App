import express from "express";
import { showLogin, login, logout } from "../controllers/authController.js";
import { loginRateLimiter } from "../middleware/auth.js";

const router = express.Router();

router.get("/login", showLogin);
router.post("/login", loginRateLimiter, login);
router.post("/logout", logout);

export default router;
