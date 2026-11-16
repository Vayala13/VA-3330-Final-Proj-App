import { listCasesByStatus, parseCaseFilters, getAttorneys } from "../services/caseService.js";
import { CASE_TYPES } from "../services/constants.js";

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
