export const ROLES = Object.freeze({
  ADMIN: "admin",
  ATTORNEY: "attorney",
  PARALEGAL: "paralegal"
});

export const SALT_ROUNDS = 10;

export const MIN_PASSWORD_LENGTH = 8;

// Listed in the order the case list shows its groups.
export const CASE_STATUSES = Object.freeze({
  ACTIVE: "Active",
  INTAKE: "Intake",
  REFERRED_OUT: "Referred out",
  CLOSED: "Closed"
});

// Only attorneys and admins can move a case into one of these statuses.
export const ATTORNEY_ONLY_STATUSES = Object.freeze([CASE_STATUSES.REFERRED_OUT, CASE_STATUSES.CLOSED]);

export const CASE_TYPES = Object.freeze({
  PERSONAL_INJURY: "Personal injury",
  CONTRACT_DISPUTE: "Contract dispute",
  EMPLOYMENT: "Employment",
  PROPERTY: "Property",
  INSURANCE: "Insurance"
});

export const DEADLINE_FLAGS = Object.freeze({
  OVERDUE: "Overdue",
  DUE_SOON: "Due soon",
  ON_TRACK: "On track"
});

export const DEADLINE_KINDS = Object.freeze({
  COURT_FILING: "Court filing",
  DISCOVERY: "Discovery",
  HEARING: "Hearing",
  STATUTE_OF_LIMITATIONS: "Statute of limitations",
  INTERNAL: "Internal"
});

// A deadline due today or within this many days is "Due soon".
export const DUE_SOON_DAYS = 7;

// The deadline view shows deadlines due within this many days (3 weeks).
export const DEADLINE_WINDOW_DAYS = 21;

// An active case untouched for more than this many days is stale.
export const STALE_CASE_DAYS = 365;

// Listed from most to least urgent; the to-do list sorts by this order.
export const TASK_PRIORITIES = Object.freeze({
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low"
});

export const TASK_STATUSES = Object.freeze({
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  DONE: "Done"
});

export const CALL_DIRECTIONS = Object.freeze({
  INCOMING: "Incoming",
  OUTGOING: "Outgoing"
});

export const ACTIVITY_ACTIONS = Object.freeze({
  CASE_CREATED: "Created case",
  CASE_UPDATED: "Updated case",
  STATUS_CHANGED: "Changed status",
  DEADLINE_ADDED: "Added deadline",
  DEADLINE_MOVED: "Moved deadline",
  DEADLINE_COMPLETED: "Completed deadline",
  TASK_ADDED: "Added task",
  TASK_UPDATED: "Updated task",
  CALL_LOGGED: "Logged call"
});
