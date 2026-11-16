import { DEADLINE_FLAGS, DUE_SOON_DAYS } from "./constants.js";
import { daysBetween } from "./dates.js";

export class Deadline {
  constructor({ deadlineId, caseId, title, kind, dueDate, ownerId, completedDate = null }) {
    this.deadlineId = deadlineId;
    this.caseId = caseId;
    this.title = title;
    this.kind = kind;
    this.dueDate = dueDate;
    this.ownerId = ownerId;
    this.completedDate = completedDate;
  }

  isCompleted() {
    return this.completedDate !== null;
  }

  daysUntilDue(today) {
    return daysBetween(today, this.dueDate);
  }

  // Completed deadlines have no flag.
  flag(today) {
    if (this.isCompleted()) {
      return null;
    }
    const days = this.daysUntilDue(today);
    if (days < 0) {
      return DEADLINE_FLAGS.OVERDUE;
    }
    if (days <= DUE_SOON_DAYS) {
      return DEADLINE_FLAGS.DUE_SOON;
    }
    return DEADLINE_FLAGS.ON_TRACK;
  }

  complete(date) {
    this.completedDate = date;
  }
}
