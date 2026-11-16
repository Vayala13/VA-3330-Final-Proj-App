import { CASE_STATUSES } from "./constants.js";
import { daysBetween } from "./dates.js";

export class Case {
  constructor({
    caseId,
    caption,
    causeNumber,
    clientName,
    type,
    status,
    leadAttorneyId,
    lastTouchedBy,
    lastTouchedDate
  }) {
    this.caseId = caseId;
    this.caption = caption;
    this.causeNumber = causeNumber;
    this.clientName = clientName;
    this.type = type;
    this.status = status;
    this.leadAttorneyId = leadAttorneyId;
    this.lastTouchedBy = lastTouchedBy;
    this.lastTouchedDate = lastTouchedDate;
  }

  isActive() {
    return this.status === CASE_STATUSES.ACTIVE;
  }

  touch(userId, date) {
    this.lastTouchedBy = userId;
    this.lastTouchedDate = date;
  }

  daysSinceTouched(today) {
    return daysBetween(this.lastTouchedDate, today);
  }
}
