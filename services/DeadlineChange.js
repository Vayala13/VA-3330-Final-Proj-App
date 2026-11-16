export class DeadlineChange {
  constructor({ changeId, deadlineId, oldDate, newDate, reason, changedBy, changedDate }) {
    this.changeId = changeId;
    this.deadlineId = deadlineId;
    this.oldDate = oldDate;
    this.newDate = newDate;
    this.reason = reason;
    this.changedBy = changedBy;
    this.changedDate = changedDate;
  }
}
