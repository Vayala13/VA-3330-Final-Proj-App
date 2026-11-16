import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./dataStore.js";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { completeDeadline, listUpcomingDeadlines } from "./deadlineService.js";
import { completeTask, listTodo } from "./taskService.js";
import { getActivityForCase } from "./activityService.js";
import { ACTIVITY_ACTIONS, TASK_STATUSES } from "./constants.js";

const TODAY = "2026-11-15";
const NOW = new Date(2026, 10, 15, 14, 30);

let ana;

before(async () => {
  await seedUsers();
  ana = findUserByEmail("agarza@mbmt.test");
});

beforeEach(() => seedSampleData(TODAY));

const deadlineNamed = (title) => db.deadlines.find((d) => d.title === title);
const taskNamed = (title) => db.tasks.find((t) => t.title === title);

test("marking a deadline done records the date, writes an Activity, and drops it from the list", () => {
  const discovery = deadlineNamed("Discovery responses due");
  completeDeadline(String(discovery.deadlineId), ana, NOW);

  assert.equal(discovery.completedDate, TODAY);
  const [latest] = getActivityForCase(discovery.caseId);
  assert.equal(latest.action, ACTIVITY_ACTIONS.DEADLINE_COMPLETED);
  assert.equal(db.cases.find((c) => c.caseId === discovery.caseId).lastTouchedBy, ana.userId);
  assert.ok(!listUpcomingDeadlines(TODAY).some((row) => row.deadlineId === discovery.deadlineId));
});

test("a deadline can't be marked done twice, and unknown ids are 404", () => {
  const settlement = deadlineNamed("File settlement papers");
  assert.throws(() => completeDeadline(settlement.deadlineId, ana, NOW), { status: 400 });
  assert.throws(() => completeDeadline("999", ana, NOW), { status: 404 });
});

test("marking a task done writes an Activity and drops it from the to-do list", () => {
  const conflict = taskNamed("Run conflict check");
  completeTask(String(conflict.taskId), ana, NOW);

  assert.equal(conflict.status, TASK_STATUSES.DONE);
  assert.equal(getActivityForCase(conflict.caseId)[0].action, ACTIVITY_ACTIONS.TASK_COMPLETED);
  assert.ok(!listTodo({}, TODAY).some((row) => row.taskId === conflict.taskId));
});

test("a parent task can't be marked done while subtasks are open", () => {
  const motion = taskNamed("Motion to compel discovery");
  const activitiesBefore = db.activities.length;
  assert.throws(() => completeTask(motion.taskId, ana, NOW), {
    status: 400,
    message: /Research and outline, Draft the motion, Attorney review, File with the court/
  });
  assert.equal(motion.status, TASK_STATUSES.OPEN);
  assert.equal(db.activities.length, activitiesBefore);

  for (const subtask of db.tasks.filter((t) => t.parentTaskId === motion.taskId)) {
    completeTask(subtask.taskId, ana, NOW);
  }
  completeTask(motion.taskId, ana, NOW);
  assert.equal(motion.status, TASK_STATUSES.DONE);
});

test("a task can't be marked done twice, and unknown ids are 404", () => {
  const closing = taskNamed("Send closing letter to client");
  assert.throws(() => completeTask(closing.taskId, ana, NOW), { status: 400 });
  assert.throws(() => completeTask("abc", ana, NOW), { status: 404 });
});
