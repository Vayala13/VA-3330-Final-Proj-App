import { addDays } from "./dates.js";

// subtaskTitles[i] is due daysBeforeDue[i] days before the parent task's due date.
export class TaskTemplate {
  constructor({ templateId, name, subtaskTitles, daysBeforeDue }) {
    if (subtaskTitles.length !== daysBeforeDue.length) {
      throw new Error(`Template "${name}" needs one daysBeforeDue value per subtask.`);
    }
    this.templateId = templateId;
    this.name = name;
    this.subtaskTitles = subtaskTitles;
    this.daysBeforeDue = daysBeforeDue;
  }

  subtaskDueDates(parentDueDate) {
    return this.subtaskTitles.map((title, index) => ({
      title,
      dueDate: addDays(parentDueDate, -this.daysBeforeDue[index])
    }));
  }
}
