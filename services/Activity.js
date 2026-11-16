export class Activity {
  constructor({ activityId, caseId, userId, action, detail, timestamp }) {
    this.activityId = activityId;
    this.caseId = caseId;
    this.userId = userId;
    this.action = action;
    this.detail = detail;
    this.timestamp = timestamp;
  }
}
