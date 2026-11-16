import { listUpcomingDeadlines } from "./deadlineService.js";
import { listTodo } from "./taskService.js";
import { listStaleCases } from "./caseService.js";
import { today as currentDate } from "./dates.js";
import { DEADLINE_FLAGS } from "./constants.js";

// Counts for the home page. Deadline and task counts are the signed-in user's own work.
export function getDashboard(user, today = currentDate()) {
  const myDeadlines = listUpcomingDeadlines(today, { ownerId: user.userId });
  const myTasks = listTodo({ ownerId: user.userId }, today);
  return {
    myOverdueDeadlines: myDeadlines.filter((d) => d.flag === DEADLINE_FLAGS.OVERDUE).length,
    myDueSoonDeadlines: myDeadlines.filter((d) => d.flag === DEADLINE_FLAGS.DUE_SOON).length,
    myTasksNeedingAttention: myTasks.filter((t) => t.label !== null).length,
    myOpenTasks: myTasks.length,
    staleCases: listStaleCases(today).length
  };
}
