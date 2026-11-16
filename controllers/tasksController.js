import { listTodo, completeTask, findTask } from "../services/taskService.js";
import { getAllUsers, parseOwnerFilter } from "../services/userService.js";
import { setFlash } from "../middleware/flash.js";
import { returnPath } from "./returnTo.js";

export function listTasks(req, res, next) {
  try {
    const ownerId = parseOwnerFilter(req.query.owner, req.user);
    res.render("tasks.ejs", {
      title: "To-do",
      tasks: listTodo({ ownerId }),
      staff: getAllUsers(),
      owner: req.query.owner || "",
      ownerName: getAllUsers().find((person) => person.userId === ownerId)?.name ?? null
    });
  } catch (error) {
    next(error);
  }
}

export function markTaskDone(req, res, next) {
  try {
    const task = findTask(req.params.taskId);
    try {
      completeTask(task.taskId, req.user);
      setFlash(req, "success", `Marked "${task.title}" done.`);
    } catch (error) {
      if (error.status !== 400) {
        throw error;
      }
      setFlash(req, "error", error.message);
    }
    res.redirect(returnPath(req.body, task.caseId));
  } catch (error) {
    next(error);
  }
}
