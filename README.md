# LAW FIRM Case Tracker

A case tracker for a small civil-litigation law firm intended to help paralegals in their day-today work. It replaces two spreadsheets (inquiries and active cases), a handwritten deadline calendar, and staff memory of who last worked a case with one place to track cases, deadlines, and daily tasks.

CSCI 3330 Exam #2 project by Viviana Ayala.

## Run it locally

Requires [Node.js](https://nodejs.org/) 20.11 or newer.

```
npm install
npm start
```

Then open http://localhost:3000 and log in with a demo account.

To restart automatically when files change, use `npm run dev` instead of `npm start`.

## Demo accounts

Every account uses the password `CaseTracker1!`.

| Name | Email | Role |
|---|---|---|
| Diana Torres | dtorres@mbmt.test | admin |
| Michael Benson | mbenson@mbmt.test | attorney |
| Teresa Montoya | tmontoya@mbmt.test | attorney |
| Ana Garza | agarza@mbmt.test | paralegal |
| Luis Ortega | lortega@mbmt.test | paralegal |

All data is kept in memory and reset to the sample data each time the server starts.

## Business requirements

1. **Deadline view:** every deadline in the next 3 weeks, marked Overdue, Due soon, or On track.
2. **Case list:** all cases grouped by status (Active, Intake, Referred out, Closed), filterable by attorney and case type.
3. **Stale cases:** active cases nobody has touched in more than a year, longest-quiet first.
4. **Audit trail:** every save records who touched a case, what they did, and when.
5. **Deadline changes:** a deadline can only be moved with a reason, and the old date stays in its history.
6. **Daily to-do list:** one list sorted overdue first, then due today, then by priority.
7. **Ownership:** any task or deadline can be assigned to a named person, and each person can view only their own work.

## Pages

| Page | Address | What it shows |
|---|---|---|
| Home | `/` | Counts of my overdue deadlines, my tasks due today, and stale cases |
| To-do | `/tasks` | Open tasks, overdue first, then due today, then by priority, each with a Mark done button |
| Cases | `/cases` | All cases grouped by status, with attorney and type filters |
| Case detail | `/cases/:caseId` | Case facts, deadlines, tasks, and the full history, with forms to add a deadline or task |
| New / edit case | `/cases/new`, `/cases/:caseId/edit` | Form to create or update a case |
| Deadlines | `/deadlines` | Open deadlines in the next 3 weeks, flagged Overdue, Due soon, or On track |
| Move deadline | `/deadlines/:deadlineId/move` | Form to change a due date, with a required reason |
| Stale cases | `/cases/stale` | Active cases untouched for more than a year |
| Staff | `/staff` | Staff accounts and a form to add one (admins only) |

## How to see each requirement

Log in as `agarza@mbmt.test` unless noted.

1. **Deadline view:** click **Deadlines**. 9 deadlines show red Overdue, yellow Due soon, or green On track.
2. **Case list:** click **Cases**, then filter by an attorney or case type.
3. **Stale cases:** click **Stale cases**. Sandoval (540 days), Pena (420), and Moreno (380) appear in that order.
4. **Audit trail:** open any case and edit it, add a deadline, or add a task. The History table at the bottom shows who, what, and when.
5. **Deadline changes:** on a case page, click **Move** next to a deadline. A blank reason is rejected; a real move appears under the deadline with the old date.
6. **Daily to-do list:** click **To-do**. On a case page, choose the Motion or Deposition checklist when adding a task to build dated subtasks. Click **Mark done** on any task or deadline to finish it; it leaves the list and appears in the case History. A task with open subtasks can't be marked done until its subtasks are.
7. **Ownership:** on **To-do** or **Deadlines**, choose **My work** to see only your own items.

## Security

- Staff login with passwords hashed by bcrypt (salt rounds 10); plain-text passwords are never stored.
- Every page except login requires a signed-in user.
- Role checks: only admins can view or add staff accounts, and only attorneys and admins can set a case to Closed or Referred out.
- CSRF tokens on every form that changes data.
- Login rate limit: 5 failed attempts locks that visitor out for 15 minutes.
- Security headers with helmet; error pages never show internal details.

## Tech stack

Node.js, Express, EJS templates with partials, HTML, CSS, and JavaScript. No database: data lives in in-memory object collections.

## Project structure

```
public/        static files (css, images, js; js/charCounter.js counts characters in the move reason)
views/         EJS page templates
  partials/    header, nav, footer shared by every page
routes/        map URLs to controller functions
controllers/   handle requests and choose what to render
middleware/    security, login checks, logging, error handling
services/      domain classes, in-memory data, and business rules
server.js      starts the app and connects everything
```

## Tests

```
npm test
```

Runs the automated tests in `services/` with Node's built-in test runner.
