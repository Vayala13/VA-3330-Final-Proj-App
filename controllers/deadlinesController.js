import { listUpcomingDeadlines, getDeadlineDetails, moveDeadline } from "../services/deadlineService.js";
import { getAllUsers, parseOwnerFilter } from "../services/userService.js";
import { DEADLINE_WINDOW_DAYS } from "../services/constants.js";

export function listDeadlines(req, res, next) {
  try {
    const ownerId = parseOwnerFilter(req.query.owner, req.user);
    res.render("deadlines.ejs", {
      title: "Deadlines",
      deadlines: listUpcomingDeadlines(undefined, { ownerId }),
      windowDays: DEADLINE_WINDOW_DAYS,
      staff: getAllUsers(),
      owner: req.query.owner || ""
    });
  } catch (error) {
    next(error);
  }
}

const renderMoveForm = (res, deadlineIdParam, data = {}) => {
  const deadline = getDeadlineDetails(deadlineIdParam);
  res.render("deadlineMove.ejs", { title: `Move ${deadline.title}`, deadline, form: {}, ...data });
};

export function showMoveForm(req, res, next) {
  try {
    renderMoveForm(res, req.params.deadlineId);
  } catch (error) {
    next(error);
  }
}

export function saveMove(req, res, next) {
  try {
    moveDeadline(req.params.deadlineId, req.body, req.user);
    const { caseId } = getDeadlineDetails(req.params.deadlineId);
    res.redirect(`/cases/${caseId}?deadlineMoved=1#deadlines`);
  } catch (error) {
    if (error.status === 400) {
      res.status(error.status);
      return renderMoveForm(res, req.params.deadlineId, { form: req.body, error: error.message });
    }
    next(error);
  }
}
