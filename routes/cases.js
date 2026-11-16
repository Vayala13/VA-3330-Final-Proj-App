import express from "express";
import {
  listCases,
  listStale,
  showCase,
  showNewCaseForm,
  addCase,
  showEditCaseForm,
  saveCase
} from "../controllers/casesController.js";
import { requireStatusPermission } from "../middleware/auth.js";

const router = express.Router();

router.get("/", listCases);
router.get("/new", showNewCaseForm);
router.get("/stale", listStale);
router.post("/", requireStatusPermission, addCase);
router.get("/:caseId", showCase);
router.get("/:caseId/edit", showEditCaseForm);
router.post("/:caseId", requireStatusPermission, saveCase);

export default router;
