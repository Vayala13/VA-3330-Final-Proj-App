import { db } from "./dataStore.js";
import { findUserById } from "./userService.js";
import { addDays, today as currentDate } from "./dates.js";
import { DEADLINE_WINDOW_DAYS } from "./constants.js";

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
