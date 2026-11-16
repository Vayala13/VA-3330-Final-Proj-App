import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { db } from "./dataStore.js";
import { seedUsers, findUserByEmail } from "./userService.js";
import { seedSampleData } from "./seedData.js";
import { addTask, getTasksForCase, getTaskTemplates } from "./taskService.js";
import { getActivityForCase } from "./activityService.js";
import { TASK_PRIORITIES, ACTIVITY_ACTIONS } from "./constants.js";

const TODAY = "2026-11-15";
const NOW = new Date(2026, 10, 15, 14, 30);

let ana;
let pena;

before(async () => {
  await seedUsers();
  ana = findUserByEmail("agarza@mbmt.test");
});

beforeEach(() => {
  seedSampleData(TODAY);
  pena = db.cases.find((c) => c.caption === "Pena v. Valley Medical Center");
});

const goodInput = (overrides = {}) => ({
  title: " Prepare for Dr. Lee deposition ",
  dueDate: "2026-12-15",
  priority: TASK_PRIORITIES.HIGH,
  ownerId: String(ana.userId),
  templateId: "",
  ...overrides
});

const template = (name) => getTaskTemplates().find((t) => t.name === name);

test("a task without a checklist is saved on its own", () => {
  const { parent, subtasks } = addTask(String(pena.caseId), goodInput(), ana, NOW);
  assert.equal(parent.title, "Prepare for Dr. Lee deposition");
  assert.equal(parent.parentTaskId, null);
  assert.equal(subtasks.length, 0);
});

test("a checklist builds subtasks counted back from the task's due date", () => {
  const deposition = template("Deposition");
  const { parent, subtasks } = addTask(pena.caseId, goodInput({ templateId: String(deposition.templateId) }), ana, NOW);

  assert.deepEqual(
    subtasks.map((task) => [task.title, task.dueDate]),
    [
      ["Send deposition notice", "2026-11-24"],
      ["Book court reporter", "2026-12-05"],
      ["Prepare client", "2026-12-08"],
      ["Prepare exhibit binder", "2026-12-13"]
    ]
  );
  assert.ok(subtasks.every((task) => task.parentTaskId === parent.taskId && task.ownerId === ana.userId));
});

test("the case page groups subtasks under their task", () => {
  const motion = template("Motion");
  const { parent } = addTask(pena.caseId, goodInput({ templateId: String(motion.templateId) }), ana, NOW);
  const row = getTasksForCase(pena.caseId, TODAY).find((r) => r.taskId === parent.taskId);
  assert.deepEqual(row.subtasks.map((s) => s.title), motion.subtaskTitles);
});

test("one save writes one Activity that mentions the checklist", () => {
  const before = db.activities.length;
  const deposition = template("Deposition");
  addTask(pena.caseId, goodInput({ templateId: String(deposition.templateId) }), ana, NOW);

  assert.equal(db.activities.length, before + 1);
  const [latest] = getActivityForCase(pena.caseId);
  assert.equal(latest.action, ACTIVITY_ACTIONS.TASK_ADDED);
  assert.match(latest.detail, /4 subtasks from the Deposition checklist/);
  assert.equal(pena.lastTouchedBy, ana.userId);
});

test("bad input is rejected and nothing is saved", () => {
  const tasksBefore = db.tasks.length;
  const activitiesBefore = db.activities.length;
  assert.throws(() => addTask(pena.caseId, goodInput({ title: "  " }), ana, NOW), { status: 400 });
  assert.throws(() => addTask(pena.caseId, goodInput({ dueDate: "2026-13-01" }), ana, NOW), { status: 400 });
  assert.throws(() => addTask(pena.caseId, goodInput({ priority: "Urgent" }), ana, NOW), { status: 400 });
  assert.throws(() => addTask(pena.caseId, goodInput({ ownerId: "999" }), ana, NOW), { status: 400 });
  assert.throws(() => addTask(pena.caseId, goodInput({ templateId: "999" }), ana, NOW), { status: 400 });
  assert.throws(() => addTask("999", goodInput(), ana, NOW), { status: 404 });
  assert.equal(db.tasks.length, tasksBefore);
  assert.equal(db.activities.length, activitiesBefore);
});
