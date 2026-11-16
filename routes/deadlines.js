import express from "express";
import { listDeadlines } from "../controllers/deadlinesController.js";

const router = express.Router();

router.get("/", listDeadlines);

export default router;
