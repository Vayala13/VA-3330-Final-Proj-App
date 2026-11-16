import { db, nextId } from "./dataStore.js";
import { Activity } from "./Activity.js";
import { today } from "./dates.js";

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
