import { db } from "./dataStore.js";
import { findUserById } from "./userService.js";
import { today as currentDate } from "./dates.js";
import { TODO_LABELS } from "./constants.js";

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
