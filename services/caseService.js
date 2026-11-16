import { db, nextId } from "./dataStore.js";
import { getAllUsers, findUserById } from "./userService.js";
import { recordActivity } from "./activityService.js";
import { Case } from "./Case.js";
import { today } from "./dates.js";
import {
  CASE_STATUSES,
  CASE_TYPES,
  ATTORNEY_ONLY_STATUSES,
  ROLES,
  ACTIVITY_ACTIONS,
  STALE_CASE_DAYS
} from "./constants.js";
import { isGoodStringParam } from "./validation.js";
const MAX_TEXT_LENGTH = 200;

const FIELD_LABELS = {
  caption: "caption",
  causeNumber: "cause number",
  clientName: "client",
  type: "type",
  status: "status",
  leadAttorneyId: "lead attorney"
};

export function getAttorneys() {
  return getAllUsers().filter((user) => user.role === ROLES.ATTORNEY);
}

// Turns the case list's query string into filters. Empty values mean "all".
export function parseCaseFilters({ attorneyId, type } = {}) {
  const filters = { attorneyId: null, type: null };

  if (isGoodStringParam(attorneyId)) {
    const id = Number(attorneyId);
    if (!getAttorneys().some((attorney) => attorney.userId === id)) {
      const error = new Error("Choose an attorney from the list.");
      error.status = 400;
      throw error;
    }
    filters.attorneyId = id;
  }

  if (isGoodStringParam(type)) {
    if (!Object.values(CASE_TYPES).includes(type)) {
      const error = new Error("Choose a case type from the list.");
      error.status = 400;
      throw error;
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
  status: matter.status,
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

// Active cases nobody has touched in more than STALE_CASE_DAYS, longest-quiet first.
export function listStaleCases(currentDate = today()) {
  return db.cases
    .filter((matter) => matter.isActive() && matter.daysSinceTouched(currentDate) > STALE_CASE_DAYS)
    .sort((a, b) => a.lastTouchedDate.localeCompare(b.lastTouchedDate))
    .map((matter) => ({ ...toListRow(matter), daysQuiet: matter.daysSinceTouched(currentDate) }));
}

// One case with people's names filled in, for the case detail page.
export function getCaseDetails(caseIdParam) {
  return toListRow(findCase(caseIdParam));
}

export function findCase(caseIdParam) {
  const caseId = Number(caseIdParam);
  const matter = Number.isInteger(caseId) ? db.cases.find((c) => c.caseId === caseId) : undefined;
  if (!matter) {
    const error = new Error("Case not found.");
    error.status = 404;
    throw error;
  }
  return matter;
}

// Keeping the current status is always allowed, so a paralegal can still edit a closed case's other fields.
export function canSetStatus(user, newStatus, currentStatus = null) {
  if (newStatus === currentStatus || !ATTORNEY_ONLY_STATUSES.includes(newStatus)) {
    return true;
  }
  return user.hasRole(ROLES.ATTORNEY, ROLES.ADMIN);
}

export function statusesFor(user, currentStatus = null) {
  return Object.values(CASE_STATUSES).filter((status) => canSetStatus(user, status, currentStatus));
}

const requireText = (value, label) => {
  if (!isGoodStringParam(value)) {
    const error = new Error(`${label} is required.`);
    error.status = 400;
    throw error;
  }
  const text = value.trim();
  if (text.length > MAX_TEXT_LENGTH) {
    const error = new Error(`${label} must be ${MAX_TEXT_LENGTH} characters or fewer.`);
    error.status = 400;
    throw error;
  }
  return text;
};

function validateCaseInput({ caption, causeNumber, clientName, type, status, leadAttorneyId } = {}) {
  const fields = {
    caption: requireText(caption, "Caption"),
    causeNumber: requireText(causeNumber, "Cause number"),
    clientName: requireText(clientName, "Client name"),
    type,
    status,
    leadAttorneyId: Number(leadAttorneyId)
  };
  if (!Object.values(CASE_TYPES).includes(type)) {
    const error = new Error("Choose a case type from the list.");
    error.status = 400;
    throw error;
  }
  if (!Object.values(CASE_STATUSES).includes(status)) {
    const error = new Error("Choose a status from the list.");
    error.status = 400;
    throw error;
  }
  if (!getAttorneys().some((attorney) => attorney.userId === fields.leadAttorneyId)) {
    const error = new Error("Choose a lead attorney from the list.");
    error.status = 400;
    throw error;
  }
  return fields;
}

const statusDenied = () => {
  const error = new Error("Only attorneys and admins can mark a case Closed or Referred out.");
  error.status = 403;
  return error;
};

const displayValue = (field, value) => (field === "leadAttorneyId" ? findUserById(value)?.name ?? "Unknown" : value);

export function createCase(input, user, now = new Date()) {
  const fields = validateCaseInput(input);
  if (!canSetStatus(user, fields.status)) {
    throw statusDenied();
  }

  const matter = new Case({
    caseId: nextId(db.cases, "caseId"),
    ...fields,
    lastTouchedBy: user.userId,
    lastTouchedDate: today(now)
  });
  db.cases.push(matter);
  recordActivity(
    { caseId: matter.caseId, userId: user.userId, action: ACTIVITY_ACTIONS.CASE_CREATED, detail: `Opened ${matter.caption}.` },
    now
  );
  return matter;
}

// Returns { matter, changed }. A save with no differences writes nothing.
export function updateCase(caseIdParam, input, user, now = new Date()) {
  const matter = findCase(caseIdParam);
  const fields = validateCaseInput(input);
  if (!canSetStatus(user, fields.status, matter.status)) {
    throw statusDenied();
  }

  const changedFields = Object.keys(fields).filter((field) => matter[field] !== fields[field]);
  if (changedFields.length === 0) {
    return { matter, changed: false };
  }

  const detail = changedFields
    .map((field) => `Changed ${FIELD_LABELS[field]} from ${displayValue(field, matter[field])} to ${displayValue(field, fields[field])}.`)
    .join(" ");
  Object.assign(matter, fields);
  recordActivity(
    {
      caseId: matter.caseId,
      userId: user.userId,
      action: changedFields.includes("status") ? ACTIVITY_ACTIONS.STATUS_CHANGED : ACTIVITY_ACTIONS.CASE_UPDATED,
      detail
    },
    now
  );
  return { matter, changed: true };
}
