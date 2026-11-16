import express from "express";
import { listStaff, addStaff } from "../controllers/staffController.js";
import { requireRole } from "../middleware/auth.js";
import { ROLES } from "../services/constants.js";

const router = express.Router();

router.use(requireRole(ROLES.ADMIN));

router.get("/", listStaff);
router.post("/", addStaff);

export default router;
