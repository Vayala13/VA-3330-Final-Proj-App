import { test } from "node:test";
import assert from "node:assert/strict";
import { Case } from "./Case.js";
import { Deadline } from "./Deadline.js";
import { Task } from "./Task.js";
import { TaskTemplate } from "./TaskTemplate.js";
import { addDays, daysBetween, isValidDateString } from "./dates.js";
import { CASE_STATUSES, DEADLINE_FLAGS, TASK_PRIORITIES, TASK_STATUSES } from "./constants.js";

const TODAY = "2026-11-15";

const deadlineDueIn = (days, completedDate = null) =>
  new Deadline({ deadlineId: 1, caseId: 1, title: "Answer due", kind: "Court filing", dueDate: addDays(TODAY, days), ownerId: 1, completedDate });

const task = (overrides = {}) =>
  new Task({ taskId: 1, caseId: 1, title: "Draft the motion", ownerId: 1, dueDate: TODAY, priority: TASK_PRIORITIES.MEDIUM, status: TASK_STATUSES.OPEN, ...overrides });

test("dates: adding days crosses month and year boundaries", () => {
  assert.equal(addDays("2026-11-30", 1), "2026-12-01");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(addDays("2026-03-01", -1), "2026-02-28");
});

test("dates: daysBetween counts calendar days, including across daylight saving", () => {
  assert.equal(daysBetween("2026-11-01", "2026-11-08"), 7);
  assert.equal(daysBetween("2026-03-07", "2026-03-09"), 2);
  assert.equal(daysBetween("2026-11-15", "2026-11-10"), -5);
});

test("dates: rejects impossible or badly formatted dates", () => {
  assert.equal(isValidDateString("2026-11-15"), true);
  assert.equal(isValidDateString("2026-02-30"), false);
  assert.equal(isValidDateString("2026-13-01"), false);
  assert.equal(isValidDateString("2026-11-32"), false);
  assert.equal(isValidDateString("11/15/2026"), false);
  assert.equal(isValidDateString(undefined), false);
});

test("deadline flag: due yesterday is Overdue", () => {
  assert.equal(deadlineDueIn(-1).flag(TODAY), DEADLINE_FLAGS.OVERDUE);
});

test("deadline flag: due today is Due soon", () => {
  assert.equal(deadlineDueIn(0).flag(TODAY), DEADLINE_FLAGS.DUE_SOON);
});

test("deadline flag: due in exactly 7 days is Due soon", () => {
  assert.equal(deadlineDueIn(7).flag(TODAY), DEADLINE_FLAGS.DUE_SOON);
});

test("deadline flag: due in 8 days is On track", () => {
  assert.equal(deadlineDueIn(8).flag(TODAY), DEADLINE_FLAGS.ON_TRACK);
});

test("deadline flag: a completed deadline has no flag, even if its date passed", () => {
  assert.equal(deadlineDueIn(-3, "2026-11-10").flag(TODAY), null);
});

test("case: touch records who and when; daysSinceTouched counts from that date", () => {
  const matter = new Case({ caseId: 1, caption: "Garza v. Delta Freight", status: CASE_STATUSES.ACTIVE, lastTouchedBy: 2, lastTouchedDate: "2025-01-10" });
  assert.equal(matter.isActive(), true);
  assert.equal(matter.daysSinceTouched(TODAY), 674);

  matter.touch(4, TODAY);
  assert.equal(matter.lastTouchedBy, 4);
  assert.equal(matter.daysSinceTouched(TODAY), 0);
});

test("task: overdue and due-today ignore finished tasks", () => {
  assert.equal(task({ dueDate: "2026-11-14" }).isOverdue(TODAY), true);
  assert.equal(task({ dueDate: "2026-11-14", status: TASK_STATUSES.DONE }).isOverdue(TODAY), false);
  assert.equal(task().isDueToday(TODAY), true);
  assert.equal(task({ status: TASK_STATUSES.DONE }).isDueToday(TODAY), false);
});

test("task: priority rank puts High first and Low last", () => {
  assert.equal(task({ priority: TASK_PRIORITIES.HIGH }).priorityRank(), 0);
  assert.equal(task({ priority: TASK_PRIORITIES.LOW }).priorityRank(), 2);
  assert.equal(task({ parentTaskId: 7 }).isSubtask(), true);
  assert.equal(task().isSubtask(), false);
});

test("task template: subtask due dates count back from the parent's due date", () => {
  const motion = new TaskTemplate({
    templateId: 1,
    name: "Motion",
    subtaskTitles: ["Research and outline", "Draft the motion", "Attorney review", "File with the court"],
    daysBeforeDue: [14, 7, 3, 0]
  });
  assert.deepEqual(motion.subtaskDueDates("2026-12-01"), [
    { title: "Research and outline", dueDate: "2026-11-17" },
    { title: "Draft the motion", dueDate: "2026-11-24" },
    { title: "Attorney review", dueDate: "2026-11-28" },
    { title: "File with the court", dueDate: "2026-12-01" }
  ]);
});

test("task template: refuses mismatched titles and day offsets", () => {
  assert.throws(
    () => new TaskTemplate({ templateId: 2, name: "Broken", subtaskTitles: ["A", "B"], daysBeforeDue: [3] }),
    /one daysBeforeDue value per subtask/
  );
});
