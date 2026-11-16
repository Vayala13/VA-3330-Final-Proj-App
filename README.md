# MBMT Case Tracker

A case tracker for a small civil-litigation law firm. It replaces two spreadsheets (inquiries and active cases), a handwritten deadline calendar, and staff memory of who last worked a case with one place to track cases, deadlines, and daily tasks.

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

## Security

- Staff login with passwords hashed by bcrypt (salt rounds 10); plain-text passwords are never stored.
- Every page except login requires a signed-in user.
- Role checks: only admins can view or add staff accounts.
- CSRF tokens on every form that changes data.
- Login rate limit: 5 failed attempts locks that visitor out for 15 minutes.
- Security headers with helmet; error pages never show internal details.

## Tech stack

Node.js, Express, EJS templates with partials, HTML, CSS, and JavaScript. No database: data lives in in-memory object collections.

## Project structure

```
public/        static files (css, images, js)
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
