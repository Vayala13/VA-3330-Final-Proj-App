import { listTodo } from "../services/taskService.js";
import { getAllUsers, parseOwnerFilter } from "../services/userService.js";

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
