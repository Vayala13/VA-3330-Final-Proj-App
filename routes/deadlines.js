import express from "express";
import { listDeadlines, showMoveForm, saveMove, markDeadlineDone } from "../controllers/deadlinesController.js";

const router = express.Router();

router.get("/", listDeadlines);
router.get("/:deadlineId/move", showMoveForm);
router.post("/:deadlineId/move", saveMove);
router.post("/:deadlineId/complete", markDeadlineDone);

export default router;
