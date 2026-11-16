import { db } from "./dataStore.js";
import { getAllUsers, findUserById } from "./userService.js";
import { CASE_STATUSES, CASE_TYPES, ROLES } from "./constants.js";
import { isGoodStringParam } from "./validation.js";
import { ValidationError } from "./errors.js";

export function getAttorneys() {
  return getAllUsers().filter((user) => user.role === ROLES.ATTORNEY);
}

// Turns the case list's query string into filters. Empty values mean "all".
export function parseCaseFilters({ attorneyId, type } = {}) {
  const filters = { attorneyId: null, type: null };

  if (isGoodStringParam(attorneyId)) {
    const id = Number(attorneyId);
    if (!getAttorneys().some((attorney) => attorney.userId === id)) {
      throw new ValidationError("Choose an attorney from the list.");
    }
    filters.attorneyId = id;
  }

  if (isGoodStringParam(type)) {
    if (!Object.values(CASE_TYPES).includes(type)) {
      throw new ValidationError("Choose a case type from the list.");
    }
    filters.type = type;
  }

  return filters;
}

const toListRow = (matter) => ({
  caseId: matter.caseId,
  caption: matter.caption,
  causeNumber: matter.causeNumber,
  clientName: matter.clientName,
  type: matter.type,
  leadAttorneyName: findUserById(matter.leadAttorneyId)?.name ?? "Unknown",
  lastTouchedByName: findUserById(matter.lastTouchedBy)?.name ?? "Unknown",
  lastTouchedDate: matter.lastTouchedDate
});

// Returns one group per status, in CASE_STATUSES order, each sorted by caption. Empty groups are kept.
export function listCasesByStatus({ attorneyId = null, type = null } = {}) {
  const matching = db.cases.filter(
    (matter) =>
      (attorneyId === null || matter.leadAttorneyId === attorneyId) && (type === null || matter.type === type)
  );

  return Object.values(CASE_STATUSES).map((status) => ({
    status,
    cases: matching
      .filter((matter) => matter.status === status)
      .sort((a, b) => a.caption.localeCompare(b.caption))
      .map(toListRow)
  }));
}
