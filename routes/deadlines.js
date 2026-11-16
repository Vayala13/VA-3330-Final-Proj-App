import express from "express";
import { listDeadlines, showMoveForm, saveMove } from "../controllers/deadlinesController.js";

const router = express.Router();

router.get("/", listDeadlines);
router.get("/:deadlineId/move", showMoveForm);
router.post("/:deadlineId/move", saveMove);

export default router;
