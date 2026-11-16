import { listUpcomingDeadlines } from "../services/deadlineService.js";
import { DEADLINE_WINDOW_DAYS } from "../services/constants.js";

export function listDeadlines(req, res, next) {
  try {
    res.render("deadlines.ejs", {
      title: "Deadlines",
      deadlines: listUpcomingDeadlines(),
      windowDays: DEADLINE_WINDOW_DAYS
    });
  } catch (error) {
    next(error);
  }
}
