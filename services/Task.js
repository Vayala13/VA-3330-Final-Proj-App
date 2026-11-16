import { TASK_PRIORITIES, TASK_STATUSES } from "./constants.js";

const PRIORITY_ORDER = Object.values(TASK_PRIORITIES);

export class Task {
  constructor({ taskId, caseId, parentTaskId = null, title, ownerId, dueDate, priority, status }) {
    this.taskId = taskId;
    this.caseId = caseId;
    this.parentTaskId = parentTaskId;
    this.title = title;
    this.ownerId = ownerId;
    this.dueDate = dueDate;
    this.priority = priority;
    this.status = status;
  }

  isSubtask() {
    return this.parentTaskId !== null;
  }

  isDone() {
    return this.status === TASK_STATUSES.DONE;
  }

  isOverdue(today) {
    return !this.isDone() && this.dueDate < today;
  }

  isDueToday(today) {
    return !this.isDone() && this.dueDate === today;
  }

  // 0 is most urgent (High).
  priorityRank() {
    return PRIORITY_ORDER.indexOf(this.priority);
  }
}
