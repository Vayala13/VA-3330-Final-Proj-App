import {
  listCasesByStatus,
  listStaleCases,
  parseCaseFilters,
  getAttorneys,
  findCase,
  getCaseDetails,
  statusesFor,
  createCase,
  updateCase
} from "../services/caseService.js";
import { getActivityForCase } from "../services/activityService.js";
import { CASE_TYPES, CASE_STATUSES, STALE_CASE_DAYS } from "../services/constants.js";
export function listCases(req, res, next) {
  try {
    const filters = parseCaseFilters(req.query);
    res.render("cases.ejs", {
      title: "Cases",
      groups: listCasesByStatus(filters),
      attorneys: getAttorneys(),
      caseTypes: Object.values(CASE_TYPES),
      filters
    });
  } catch (error) {
    next(error);
  }
}

export function listStale(req, res, next) {
  try {
    res.render("staleCases.ejs", {
      title: "Stale cases",
      cases: listStaleCases(),
      staleDays: STALE_CASE_DAYS
    });
  } catch (error) {
    next(error);
  }
}

export function showCase(req, res, next) {
  try {
    const matter = getCaseDetails(req.params.caseId);
    res.render("caseDetail.ejs", {
      title: matter.caption,
      matter,
      activities: getActivityForCase(matter.caseId),
      saved: req.query.saved === "1",
      unchanged: req.query.unchanged === "1"
    });
  } catch (error) {
    next(error);
  }
}

const renderCaseForm = (res, { user, currentStatus = null, ...data }) =>
  res.render("caseForm.ejs", {
    attorneys: getAttorneys(),
    caseTypes: Object.values(CASE_TYPES),
    statuses: statusesFor(user, currentStatus),
    ...data
  });

export function showNewCaseForm(req, res, next) {
  try {
    renderCaseForm(res, {
      user: req.user,
      title: "New case",
      action: "/cases",
      form: { status: CASE_STATUSES.INTAKE }
    });
  } catch (error) {
    next(error);
  }
}

export function addCase(req, res, next) {
  try {
    const matter = createCase(req.body, req.user);
    res.redirect(`/cases/${matter.caseId}?saved=1`);
  } catch (error) {
    if (error.status === 400) {
      res.status(error.status);
      return renderCaseForm(res, {
        user: req.user,
        title: "New case",
        action: "/cases",
        form: req.body,
        error: error.message
      });
    }
    next(error);
  }
}

export function showEditCaseForm(req, res, next) {
  try {
    const matter = findCase(req.params.caseId);
    renderCaseForm(res, {
      user: req.user,
      currentStatus: matter.status,
      title: `Edit ${matter.caption}`,
      action: `/cases/${matter.caseId}`,
      cancelUrl: `/cases/${matter.caseId}`,
      form: matter
    });
  } catch (error) {
    next(error);
  }
}

export function saveCase(req, res, next) {
  try {
    const { matter, changed } = updateCase(req.params.caseId, req.body, req.user);
    res.redirect(`/cases/${matter.caseId}?${changed ? "saved" : "unchanged"}=1`);
  } catch (error) {
    if (error.status === 400) {
      const matter = findCase(req.params.caseId);
      res.status(error.status);
      return renderCaseForm(res, {
        user: req.user,
        currentStatus: matter.status,
        title: `Edit ${matter.caption}`,
        action: `/cases/${matter.caseId}`,
        cancelUrl: `/cases/${matter.caseId}`,
        form: req.body,
        error: error.message
      });
    }
    next(error);
  }
}
