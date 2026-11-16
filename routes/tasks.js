import express from "express";
import { listTasks, markTaskDone } from "../controllers/tasksController.js";

const router = express.Router();

router.get("/", listTasks);
router.post("/:taskId/complete", markTaskDone);

export default router;
