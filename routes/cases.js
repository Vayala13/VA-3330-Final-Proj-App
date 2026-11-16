import express from "express";
import { listCases } from "../controllers/casesController.js";

const router = express.Router();

router.get("/", listCases);

export default router;
