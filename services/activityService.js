import { db, nextId } from "./dataStore.js";
import { Activity } from "./Activity.js";
import { today } from "./dates.js";
import { findUserById } from "./userService.js";

const formatTimestamp = (timestamp) =>
  new Date(timestamp).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });

// Audit trail for one case, newest first, with the person's name instead of their id.
export function getActivityForCase(caseId) {
  return db.activities
    .filter((activity) => activity.caseId === caseId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp) || b.activityId - a.activityId)
    .map((activity) => ({
      activityId: activity.activityId,
      userName: findUserById(activity.userId)?.name ?? "Unknown",
      action: activity.action,
      detail: activity.detail,
      timestamp: activity.timestamp,
      when: formatTimestamp(activity.timestamp)
    }));
}

// The only way to write an audit-trail entry. It also updates the case's last-touched fields,
// so the two can never disagree.
export function recordActivity({ caseId, userId, action, detail }, now = new Date()) {
  const matter = db.cases.find((c) => c.caseId === caseId);
  if (!matter) {
    throw new Error(`Cannot record activity for missing case ${caseId}.`);
  }

  const activity = new Activity({
    activityId: nextId(db.activities, "activityId"),
    caseId,
    userId,
    action,
    detail,
    timestamp: now.toISOString()
  });
  db.activities.push(activity);
  matter.touch(userId, today(now));
  return activity;
}
