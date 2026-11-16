import { getDashboard } from "../services/dashboardService.js";

export function showHome(req, res, next) {
  try {
    res.render("home.ejs", { title: "Home", dashboard: getDashboard(req.user) });
  } catch (error) {
    next(error);
  }
}
