import { db, nextId } from "./dataStore.js";
import { findUserById } from "./userService.js";
import { recordActivity } from "./activityService.js";
import { findCase } from "./caseService.js";
import { Deadline } from "./Deadline.js";
import { DeadlineChange } from "./DeadlineChange.js";
import { addDays, isValidDateString, today as currentDate } from "./dates.js";
import { DEADLINE_WINDOW_DAYS, DEADLINE_KINDS, ACTIVITY_ACTIONS } from "./constants.js";
import { isGoodStringParam } from "./validation.js";

const MAX_TEXT_LENGTH = 200;

const badInput = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

const requireText = (value, label) => {
  if (!isGoodStringParam(value)) {
    throw badInput(`${label} is required.`);
  }
  const text = value.trim();
  if (text.length > MAX_TEXT_LENGTH) {
    throw badInput(`${label} must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  }
  return text;
};

const requireDate = (value, label) => {
  if (!isValidDateString(value)) {
    throw badInput(`${label} must be a real date.`);
  }
  return value;
};

const toDeadlineRow = (deadline, today) => {
  const matter = db.cases.find((c) => c.caseId === deadline.caseId);
  return {
    deadlineId: deadline.deadlineId,
    caseId: deadline.caseId,
    caption: matter?.caption ?? "Unknown case",
    title: deadline.title,
    kind: deadline.kind,
    dueDate: deadline.dueDate,
    ownerName: findUserById(deadline.ownerId)?.name ?? "Unassigned",
    completedDate: deadline.completedDate,
    daysUntilDue: deadline.daysUntilDue(today),
    flag: deadline.flag(today)
  };
};

// Open deadlines due within the next 3 weeks, plus every overdue one, soonest first.
export function listUpcomingDeadlines(today = currentDate()) {
  const lastDay = addDays(today, DEADLINE_WINDOW_DAYS);
  return db.deadlines
    .filter((deadline) => !deadline.isCompleted() && deadline.dueDate <= lastDay)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))
    .map((deadline) => toDeadlineRow(deadline, today));
}

// Every move of one deadline's due date, oldest first.
export function getDeadlineHistory(deadlineId) {
  return db.deadlineChanges
    .filter((change) => change.deadlineId === deadlineId)
    .sort((a, b) => a.changedDate.localeCompare(b.changedDate) || a.changeId - b.changeId)
    .map((change) => ({
      changeId: change.changeId,
      oldDate: change.oldDate,
      newDate: change.newDate,
      reason: change.reason,
      changedByName: findUserById(change.changedBy)?.name ?? "Unknown",
      changedDate: change.changedDate
    }));
}

// All of one case's deadlines, soonest first, each with its move history.
export function getDeadlinesForCase(caseId, today = currentDate()) {
  return db.deadlines
    .filter((deadline) => deadline.caseId === caseId)
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title))
    .map((deadline) => ({ ...toDeadlineRow(deadline, today), history: getDeadlineHistory(deadline.deadlineId) }));
}

export function findDeadline(deadlineIdParam) {
  const deadlineId = Number(deadlineIdParam);
  const deadline = Number.isInteger(deadlineId) ? db.deadlines.find((d) => d.deadlineId === deadlineId) : undefined;
  if (!deadline) {
    const error = new Error("Deadline not found.");
    error.status = 404;
    throw error;
  }
  return deadline;
}

export function addDeadline(caseIdParam, { title, kind, dueDate, ownerId } = {}, user, now = new Date()) {
  const matter = findCase(caseIdParam);
  const fields = {
    title: requireText(title, "Title"),
    kind,
    dueDate: requireDate(dueDate, "Due date"),
    ownerId: Number(ownerId)
  };
  if (!Object.values(DEADLINE_KINDS).includes(kind)) {
    throw badInput("Choose a deadline kind from the list.");
  }
  const owner = findUserById(fields.ownerId);
  if (!owner) {
    throw badInput("Choose an owner from the list.");
  }

  const deadline = new Deadline({ deadlineId: nextId(db.deadlines, "deadlineId"), caseId: matter.caseId, ...fields });
  db.deadlines.push(deadline);
  recordActivity(
    {
      caseId: matter.caseId,
      userId: user.userId,
      action: ACTIVITY_ACTIONS.DEADLINE_ADDED,
      detail: `Added "${deadline.title}" due ${deadline.dueDate}, owned by ${owner.name}.`
    },
    now
  );
  return deadline;
}

// The only way to change a deadline's due date. The old date is kept as a DeadlineChange.
export function moveDeadline(deadlineIdParam, { newDate, reason } = {}, user, now = new Date()) {
  const deadline = findDeadline(deadlineIdParam);
  const toDate = requireDate(newDate, "New due date");
  const why = requireText(reason, "Reason");
  if (deadline.isCompleted()) {
    throw badInput("A completed deadline can't be moved.");
  }
  if (toDate === deadline.dueDate) {
    throw badInput("The new due date is the same as the current one.");
  }

  const change = new DeadlineChange({
    changeId: nextId(db.deadlineChanges, "changeId"),
    deadlineId: deadline.deadlineId,
    oldDate: deadline.dueDate,
    newDate: toDate,
    reason: why,
    changedBy: user.userId,
    changedDate: currentDate(now)
  });
  db.deadlineChanges.push(change);
  deadline.dueDate = toDate;
  recordActivity(
    {
      caseId: deadline.caseId,
      userId: user.userId,
      action: ACTIVITY_ACTIONS.DEADLINE_MOVED,
      detail: `Moved "${deadline.title}" from ${change.oldDate} to ${change.newDate}: ${why}`
    },
    now
  );
  return change;
}
