import { db, nextId } from "./dataStore.js";
import { findUserById } from "./userService.js";
import { recordActivity } from "./activityService.js";
import { findCase } from "./caseService.js";
import { Task } from "./Task.js";
import { isValidDateString, today as currentDate } from "./dates.js";
import { TODO_LABELS, TASK_PRIORITIES, TASK_STATUSES, ACTIVITY_ACTIONS } from "./constants.js";
import { isGoodStringParam } from "./validation.js";

const MAX_TEXT_LENGTH = 200;

const badInput = (message) => {
  const error = new Error(message);
  error.status = 400;
  return error;
};

// 0 = overdue, 1 = due today, 2 = due later.
const urgencyRank = (task, today) => {
  if (task.isOverdue(today)) {
    return 0;
  }
  return task.isDueToday(today) ? 1 : 2;
};

const urgencyLabel = (task, today) => {
  if (task.isOverdue(today)) {
    return TODO_LABELS.OVERDUE;
  }
  return task.isDueToday(today) ? TODO_LABELS.DUE_TODAY : null;
};

// Overdue first, then due today, then by priority. Ties go to the earlier due date, then the title.
export function compareTodo(a, b, today) {
  return (
    urgencyRank(a, today) - urgencyRank(b, today) ||
    a.priorityRank() - b.priorityRank() ||
    a.dueDate.localeCompare(b.dueDate) ||
    a.title.localeCompare(b.title)
  );
}

const toTodoRow = (task, today) => ({
  taskId: task.taskId,
  caseId: task.caseId,
  caption: db.cases.find((c) => c.caseId === task.caseId)?.caption ?? "Unknown case",
  title: task.title,
  parentTitle: task.isSubtask() ? db.tasks.find((t) => t.taskId === task.parentTaskId)?.title ?? null : null,
  ownerName: findUserById(task.ownerId)?.name ?? "Unassigned",
  dueDate: task.dueDate,
  priority: task.priority,
  status: task.status,
  label: urgencyLabel(task, today)
});

// The daily to-do list: every open task, or only one person's when ownerId is given.
export function listTodo({ ownerId = null } = {}, today = currentDate()) {
  return db.tasks
    .filter((task) => !task.isDone() && (ownerId === null || task.ownerId === ownerId))
    .sort((a, b) => compareTodo(a, b, today))
    .map((task) => toTodoRow(task, today));
}

// One case's top-level tasks, soonest first, each with its subtasks in due-date order.
export function getTasksForCase(caseId, today = currentDate()) {
  const byDueDate = (a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title);
  const caseTasks = db.tasks.filter((task) => task.caseId === caseId);
  return caseTasks
    .filter((task) => !task.isSubtask())
    .sort(byDueDate)
    .map((parent) => ({
      ...toTodoRow(parent, today),
      subtasks: caseTasks
        .filter((task) => task.parentTaskId === parent.taskId)
        .sort(byDueDate)
        .map((task) => toTodoRow(task, today))
    }));
}

export function findTask(taskIdParam) {
  const taskId = Number(taskIdParam);
  const task = Number.isInteger(taskId) ? db.tasks.find((t) => t.taskId === taskId) : undefined;
  if (!task) {
    const error = new Error("Task not found.");
    error.status = 404;
    throw error;
  }
  return task;
}

// A task with open subtasks can't be marked done until they are.
export function completeTask(taskIdParam, user, now = new Date()) {
  const task = findTask(taskIdParam);
  if (task.isDone()) {
    throw badInput("This task is already done.");
  }
  const openSubtasks = db.tasks.filter((t) => t.parentTaskId === task.taskId && !t.isDone());
  if (openSubtasks.length > 0) {
    throw badInput(`Finish these subtasks first: ${openSubtasks.map((t) => t.title).join(", ")}.`);
  }
  task.complete();
  recordActivity(
    {
      caseId: task.caseId,
      userId: user.userId,
      action: ACTIVITY_ACTIONS.TASK_COMPLETED,
      detail: `Marked task "${task.title}" done.`
    },
    now
  );
  return task;
}

export function getTaskTemplates() {
  return [...db.taskTemplates];
}

const findTemplate = (templateIdParam) => {
  if (!isGoodStringParam(templateIdParam)) {
    return null;
  }
  const template = db.taskTemplates.find((t) => t.templateId === Number(templateIdParam));
  if (!template) {
    throw badInput("Choose a checklist from the list.");
  }
  return template;
};

function validateTaskInput({ title, dueDate, priority, ownerId } = {}) {
  if (!isGoodStringParam(title)) {
    throw badInput("Title is required.");
  }
  if (title.trim().length > MAX_TEXT_LENGTH) {
    throw badInput(`Title must be ${MAX_TEXT_LENGTH} characters or fewer.`);
  }
  if (!isValidDateString(dueDate)) {
    throw badInput("Due date must be a real date.");
  }
  if (!Object.values(TASK_PRIORITIES).includes(priority)) {
    throw badInput("Choose a priority from the list.");
  }
  const owner = findUserById(Number(ownerId));
  if (!owner) {
    throw badInput("Choose an owner from the list.");
  }
  return { title: title.trim(), dueDate, priority, ownerId: owner.userId };
}

// Adds a task. With a template, also builds its subtasks, each due a set number of days before the task,
// owned by the same person. One save, so one Activity.
export function addTask(caseIdParam, input = {}, user, now = new Date()) {
  const matter = findCase(caseIdParam);
  const fields = validateTaskInput(input);
  const template = findTemplate(input.templateId);

  const newTask = (extra) => {
    const task = new Task({
      taskId: nextId(db.tasks, "taskId"),
      caseId: matter.caseId,
      status: TASK_STATUSES.OPEN,
      ...fields,
      ...extra
    });
    db.tasks.push(task);
    return task;
  };

  const parent = newTask({});
  const subtasks = template
    ? template.subtaskDueDates(parent.dueDate).map(({ title, dueDate }) => newTask({ parentTaskId: parent.taskId, title, dueDate }))
    : [];

  const ownerName = findUserById(parent.ownerId).name;
  const fromTemplate = template ? ` with ${subtasks.length} subtasks from the ${template.name} checklist` : "";
  recordActivity(
    {
      caseId: matter.caseId,
      userId: user.userId,
      action: ACTIVITY_ACTIONS.TASK_ADDED,
      detail: `Added task "${parent.title}" due ${parent.dueDate}, owned by ${ownerName}${fromTemplate}.`
    },
    now
  );
  return { parent, subtasks };
}
