import {
  listCasesByStatus,
  parseCaseFilters,
  getAttorneys,
  findCase,
  statusesFor,
  createCase,
  updateCase
} from "../services/caseService.js";
import { CASE_TYPES, CASE_STATUSES } from "../services/constants.js";
import { ValidationError } from "../services/errors.js";

export function listCases(req, res, next) {
  try {
    const filters = parseCaseFilters(req.query);
    res.render("cases.ejs", {
      title: "Cases",
      groups: listCasesByStatus(filters),
      attorneys: getAttorneys(),
      caseTypes: Object.values(CASE_TYPES),
      filters,
      saved: req.query.saved,
      unchanged: req.query.unchanged
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
    res.redirect(`/cases?saved=${encodeURIComponent(matter.caption)}`);
  } catch (error) {
    if (error instanceof ValidationError) {
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
      form: matter
    });
  } catch (error) {
    next(error);
  }
}

export function saveCase(req, res, next) {
  try {
    const { matter, changed } = updateCase(req.params.caseId, req.body, req.user);
    const param = changed ? "saved" : "unchanged";
    res.redirect(`/cases?${param}=${encodeURIComponent(matter.caption)}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      const matter = findCase(req.params.caseId);
      res.status(error.status);
      return renderCaseForm(res, {
        user: req.user,
        currentStatus: matter.status,
        title: `Edit ${matter.caption}`,
        action: `/cases/${matter.caseId}`,
        form: req.body,
        error: error.message
      });
    }
    next(error);
  }
}
