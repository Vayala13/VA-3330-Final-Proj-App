export class CallLog {
  constructor({
    callLogId,
    caseId,
    userId,
    direction,
    callerName,
    summary,
    followUpNeeded = false,
    actionItems = [],
    timestamp
  }) {
    this.callLogId = callLogId;
    this.caseId = caseId;
    this.userId = userId;
    this.direction = direction;
    this.callerName = callerName;
    this.summary = summary;
    this.followUpNeeded = followUpNeeded;
    this.actionItems = actionItems;
    this.timestamp = timestamp;
  }
}
