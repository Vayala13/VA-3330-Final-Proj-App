import { db, nextId, clearData } from "./dataStore.js";
import { findUserByEmail } from "./userService.js";
import { Case } from "./Case.js";
import { Deadline } from "./Deadline.js";
import { DeadlineChange } from "./DeadlineChange.js";
import { Task } from "./Task.js";
import { Activity } from "./Activity.js";
import { TaskTemplate } from "./TaskTemplate.js";
import { CallLog } from "./CallLog.js";
import { addDays, today as currentDate } from "./dates.js";
import {
  CASE_STATUSES,
  CASE_TYPES,
  DEADLINE_KINDS,
  TASK_PRIORITIES,
  TASK_STATUSES,
  CALL_DIRECTIONS,
  ACTIVITY_ACTIONS
} from "./constants.js";

const timestampOn = (date, time) => new Date(`${date}T${time}:00`).toISOString();

const addActivity = ({ caseId, userId, action, detail, date, time = "10:00" }) => {
  db.activities.push(
    new Activity({ activityId: nextId(db.activities, "activityId"), caseId, userId, action, detail, timestamp: timestampOn(date, time) })
  );
};

// Every date is relative to `today`, so the demo always has overdue, due-soon, and stale items.
// Must run after seedUsers().
export function seedSampleData(today = currentDate()) {
  clearData();
  const day = (offset) => addDays(today, offset);

  const userId = (email) => {
    const user = findUserByEmail(email);
    if (!user) {
      throw new Error(`Seed data needs the staff account ${email}. Run seedUsers() first.`);
    }
    return user.userId;
  };
  const diana = userId("dtorres@mbmt.test");
  const michael = userId("mbenson@mbmt.test");
  const teresa = userId("tmontoya@mbmt.test");
  const ana = userId("agarza@mbmt.test");
  const luis = userId("lortega@mbmt.test");

  const caseRows = [
    ["Garza v. Delta Freight Lines", "2025-CI-04417", "Rosa Garza", CASE_TYPES.PERSONAL_INJURY, CASE_STATUSES.ACTIVE, michael, ana, -2],
    ["Hollis v. Rio Grande Insurance Co.", "2025-CI-05102", "Mark Hollis", CASE_TYPES.INSURANCE, CASE_STATUSES.ACTIVE, teresa, luis, -10],
    ["Pena v. Valley Medical Center", "2024-CI-01988", "Elena Pena", CASE_TYPES.PERSONAL_INJURY, CASE_STATUSES.ACTIVE, michael, michael, -420],
    ["Sandoval Builders v. Cortez Holdings", "2023-CI-07731", "Sandoval Builders LLC", CASE_TYPES.CONTRACT_DISPUTE, CASE_STATUSES.ACTIVE, teresa, teresa, -540],
    ["Moreno v. Lone Star Logistics", "2024-CI-03350", "Daniel Moreno", CASE_TYPES.EMPLOYMENT, CASE_STATUSES.ACTIVE, michael, luis, -380],
    ["Trevino v. South Texas Roofing", "2025-CI-02264", "Gloria Trevino", CASE_TYPES.PROPERTY, CASE_STATUSES.ACTIVE, teresa, luis, -30],
    ["Alvarez v. Hidalgo Properties", "Not yet filed", "Carlos Alvarez", CASE_TYPES.PROPERTY, CASE_STATUSES.INTAKE, teresa, ana, -3],
    ["Castillo v. Gulf Coast Auto Sales", "Not yet filed", "Maria Castillo", CASE_TYPES.CONTRACT_DISPUTE, CASE_STATUSES.INTAKE, michael, diana, -1],
    ["Rivera v. Brightline Staffing", "2025-CI-00871", "Jorge Rivera", CASE_TYPES.EMPLOYMENT, CASE_STATUSES.REFERRED_OUT, teresa, teresa, -60],
    ["Ochoa v. Tri-County Insurance", "2023-CI-06045", "Lucia Ochoa", CASE_TYPES.INSURANCE, CASE_STATUSES.CLOSED, michael, michael, -200]
  ];
  const cases = caseRows.map(([caption, causeNumber, clientName, type, status, leadAttorneyId, lastTouchedBy, touchedOffset]) => {
    const matter = new Case({
      caseId: nextId(db.cases, "caseId"),
      caption,
      causeNumber,
      clientName,
      type,
      status,
      leadAttorneyId,
      lastTouchedBy,
      lastTouchedDate: day(touchedOffset)
    });
    db.cases.push(matter);
    return matter;
  });
  const [garza, hollis, pena, sandoval, moreno, trevino, alvarez, , , ochoa] = cases;

  const deadlineRows = [
    [garza, "Discovery responses due", DEADLINE_KINDS.DISCOVERY, -2, ana, null],
    [garza, "Hearing on motion to compel", DEADLINE_KINDS.HEARING, 5, michael, null],
    [garza, "Trial setting", DEADLINE_KINDS.HEARING, 45, michael, null],
    [hollis, "Mediation statement", DEADLINE_KINDS.COURT_FILING, 0, luis, null],
    [hollis, "Expert designation deadline", DEADLINE_KINDS.DISCOVERY, 12, teresa, null],
    [pena, "Response to motion for summary judgment", DEADLINE_KINDS.COURT_FILING, 7, michael, null],
    [sandoval, "Pretrial conference", DEADLINE_KINDS.HEARING, 18, teresa, null],
    [moreno, "Statute of limitations review", DEADLINE_KINDS.STATUTE_OF_LIMITATIONS, 20, ana, null],
    [trevino, "Answer to counterclaim", DEADLINE_KINDS.COURT_FILING, -1, luis, null],
    [alvarez, "Conflict check", DEADLINE_KINDS.INTERNAL, 2, ana, null],
    [ochoa, "File settlement papers", DEADLINE_KINDS.COURT_FILING, -31, michael, -32]
  ];
  const deadlines = deadlineRows.map(([matter, title, kind, dueOffset, ownerId, completedOffset]) => {
    const deadline = new Deadline({
      deadlineId: nextId(db.deadlines, "deadlineId"),
      caseId: matter.caseId,
      title,
      kind,
      dueDate: day(dueOffset),
      ownerId,
      completedDate: completedOffset === null ? null : day(completedOffset)
    });
    db.deadlines.push(deadline);
    return deadline;
  });

  const expertDesignation = deadlines[4];
  db.deadlineChanges.push(
    new DeadlineChange({
      changeId: nextId(db.deadlineChanges, "changeId"),
      deadlineId: expertDesignation.deadlineId,
      oldDate: day(5),
      newDate: expertDesignation.dueDate,
      reason: "Opposing counsel agreed to a one-week extension.",
      changedBy: teresa,
      changedDate: day(-20)
    })
  );

  const motionTemplate = new TaskTemplate({
    templateId: nextId(db.taskTemplates, "templateId"),
    name: "Motion",
    subtaskTitles: ["Research and outline", "Draft the motion", "Attorney review", "File with the court"],
    daysBeforeDue: [14, 7, 3, 0]
  });
  db.taskTemplates.push(motionTemplate);
  db.taskTemplates.push(
    new TaskTemplate({
      templateId: nextId(db.taskTemplates, "templateId"),
      name: "Deposition",
      subtaskTitles: ["Send deposition notice", "Book court reporter", "Prepare client", "Prepare exhibit binder"],
      daysBeforeDue: [21, 10, 7, 2]
    })
  );

  const addTask = ({ caseId, parentTaskId = null, ownerId, dueDate, priority, status = TASK_STATUSES.OPEN }) => {
    const task = new Task({ taskId: nextId(db.tasks, "taskId"), caseId, parentTaskId, ownerId, dueDate, priority, status });
    db.tasks.push(task);
    return task;
  };

  const motionToCompel = addTask({ caseId: garza.caseId, ownerId: michael, dueDate: day(10), priority: TASK_PRIORITIES.HIGH });
  for (const { dueDate } of motionTemplate.subtaskDueDates(motionToCompel.dueDate)) {
    addTask({ caseId: garza.caseId, parentTaskId: motionToCompel.taskId, ownerId: ana, dueDate, priority: TASK_PRIORITIES.MEDIUM });
  }
  addTask({ caseId: hollis.caseId, ownerId: luis, dueDate: day(0), priority: TASK_PRIORITIES.HIGH });
  addTask({ caseId: trevino.caseId, ownerId: luis, dueDate: day(-2), priority: TASK_PRIORITIES.MEDIUM, status: TASK_STATUSES.IN_PROGRESS });
  addTask({ caseId: alvarez.caseId, ownerId: ana, dueDate: day(1), priority: TASK_PRIORITIES.LOW });
  addTask({ caseId: pena.caseId, ownerId: michael, dueDate: day(4), priority: TASK_PRIORITIES.MEDIUM });
  addTask({ caseId: ochoa.caseId, ownerId: ana, dueDate: day(-40), priority: TASK_PRIORITIES.LOW, status: TASK_STATUSES.DONE });

  const callRows = [
    [garza, ana, CALL_DIRECTIONS.INCOMING, "Rosa Garza (client)", "Asked for an update on discovery and the hearing date.", true, ["Email the hearing date to the client"], -2, "14:20"],
    [hollis, luis, CALL_DIRECTIONS.OUTGOING, "Claims adjuster, Rio Grande Insurance", "Confirmed mediation availability for next month.", false, [], -10, "11:05"]
  ];
  for (const [matter, callerId, direction, callerName, summary, followUpNeeded, actionItems, offset, time] of callRows) {
    db.callLogs.push(
      new CallLog({
        callLogId: nextId(db.callLogs, "callLogId"),
        caseId: matter.caseId,
        userId: callerId,
        direction,
        callerName,
        summary,
        followUpNeeded,
        actionItems,
        timestamp: timestampOn(day(offset), time)
      })
    );
  }

  // Activity history. Each case's most recent activity matches its lastTouchedBy and lastTouchedDate.
  for (const matter of cases) {
    addActivity({ caseId: matter.caseId, userId: matter.leadAttorneyId, action: ACTIVITY_ACTIONS.CASE_CREATED, detail: `Opened ${matter.caption}.`, date: addDays(matter.lastTouchedDate, -90), time: "09:00" });
  }
  addActivity({ caseId: hollis.caseId, userId: teresa, action: ACTIVITY_ACTIONS.DEADLINE_MOVED, detail: `Moved "Expert designation deadline" from ${day(5)} to ${expertDesignation.dueDate}: opposing counsel agreed to a one-week extension.`, date: day(-20) });
  addActivity({ caseId: garza.caseId, userId: ana, action: ACTIVITY_ACTIONS.CALL_LOGGED, detail: "Logged incoming call from Rosa Garza (client).", date: day(-2), time: "14:20" });
  addActivity({ caseId: hollis.caseId, userId: luis, action: ACTIVITY_ACTIONS.CALL_LOGGED, detail: "Logged outgoing call to the claims adjuster.", date: day(-10), time: "11:05" });
  addActivity({ caseId: ochoa.caseId, userId: michael, action: ACTIVITY_ACTIONS.STATUS_CHANGED, detail: "Changed status from Active to Closed.", date: day(-200) });
  const alreadyLogged = new Set([garza.caseId, hollis.caseId, ochoa.caseId]);
  for (const matter of cases.filter((c) => !alreadyLogged.has(c.caseId))) {
    addActivity({ caseId: matter.caseId, userId: matter.lastTouchedBy, action: ACTIVITY_ACTIONS.CASE_UPDATED, detail: "Updated case details.", date: matter.lastTouchedDate });
  }
}
