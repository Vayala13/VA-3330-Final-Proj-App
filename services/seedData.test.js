import { test, before } from "node:test";
import assert from "node:assert/strict";
import { db } from "./dataStore.js";
import { seedUsers, findUserById } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { addDays } from "./dates.js";
import { CASE_STATUSES, DEADLINE_FLAGS, ROLES, STALE_CASE_DAYS, DEADLINE_WINDOW_DAYS } from "./constants.js";

const TODAY = "2026-11-15";

before(async () => {
  await seedUsers();
  seedSampleData(TODAY);
});

test("every collection has sample data", () => {
  for (const [name, items] of Object.entries(db)) {
    assert.ok(items.length > 0, `${name} is empty`);
  }
});

test("every task has a title, and template subtasks use the template's titles", () => {
  assert.ok(db.tasks.every((task) => typeof task.title === "string" && task.title.length > 0));
  const subtaskTitles = db.tasks.filter((task) => task.isSubtask()).map((task) => task.title);
  assert.deepEqual(subtaskTitles, db.taskTemplates.find((t) => t.name === "Motion").subtaskTitles);
});

test("every case status appears so each case-list group has rows", () => {
  const statuses = new Set(db.cases.map((c) => c.status));
  for (const status of Object.values(CASE_STATUSES)) {
    assert.ok(statuses.has(status), `no ${status} case`);
  }
});

test("lead attorneys are attorneys, and every person referenced is a real staff account", () => {
  for (const matter of db.cases) {
    assert.equal(findUserById(matter.leadAttorneyId)?.role, ROLES.ATTORNEY, matter.caption);
    assert.ok(findUserById(matter.lastTouchedBy), matter.caption);
  }
  const people = [
    ...db.deadlines.map((d) => d.ownerId),
    ...db.tasks.map((t) => t.ownerId),
    ...db.activities.map((a) => a.userId),
    ...db.callLogs.map((c) => c.userId),
    ...db.deadlineChanges.map((c) => c.changedBy)
  ];
  for (const id of people) {
    assert.ok(findUserById(id), `unknown user ${id}`);
  }
});

test("each case's last-touched fields match its most recent activity", () => {
  for (const matter of db.cases) {
    const latest = db.activities
      .filter((a) => a.caseId === matter.caseId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    assert.ok(latest, `${matter.caption} has no activity`);
    assert.equal(latest.userId, matter.lastTouchedBy, matter.caption);
  }
});

test("the 3-week deadline window includes all three flags", () => {
  const windowEnd = addDays(TODAY, DEADLINE_WINDOW_DAYS);
  const flags = new Set(
    db.deadlines.filter((d) => !d.isCompleted() && d.dueDate <= windowEnd).map((d) => d.flag(TODAY))
  );
  assert.deepEqual([...flags].sort(), Object.values(DEADLINE_FLAGS).sort());
});

test("some active cases are stale (untouched for more than a year)", () => {
  const stale = db.cases.filter((c) => c.isActive() && c.daysSinceTouched(TODAY) > STALE_CASE_DAYS);
  assert.equal(stale.length, 3);
});

test("the moved deadline keeps its old date in a DeadlineChange", () => {
  const [change] = db.deadlineChanges;
  const deadline = db.deadlines.find((d) => d.deadlineId === change.deadlineId);
  assert.equal(deadline.dueDate, change.newDate);
  assert.notEqual(change.oldDate, change.newDate);
  assert.ok(change.reason.length > 0);
});

test("template subtasks point to their parent and count back from its due date", () => {
  const parent = db.tasks.find((t) => db.tasks.some((s) => s.parentTaskId === t.taskId));
  const subtaskDates = db.tasks.filter((t) => t.parentTaskId === parent.taskId).map((t) => t.dueDate);
  const motion = db.taskTemplates.find((t) => t.name === "Motion");
  assert.deepEqual(subtaskDates, motion.subtaskDueDates(parent.dueDate).map((s) => s.dueDate));
});

test("seeding twice starts fresh instead of doubling the data", () => {
  const caseCount = db.cases.length;
  seedSampleData(TODAY);
  assert.equal(db.cases.length, caseCount);
  assert.equal(db.cases[0].caseId, 1);
});
