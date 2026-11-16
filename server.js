import express from "express";
import path from "node:path";
import morgan from "morgan";
import homeRouter from "./routes/home.js";
import authRouter from "./routes/auth.js";
import staffRouter from "./routes/staff.js";
import { securityHeaders, sessionMiddleware, csrfProtection } from "./middleware/security.js";
import {
  passportInitialize,
  passportSession,
  exposeCurrentUser,
  ensureAuthenticated
} from "./middleware/auth.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { seedUsers } from "./services/userService.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("views", path.join(import.meta.dirname, "views"));

app.use(morgan("dev"));
app.use(securityHeaders);
app.use(express.static(path.join(import.meta.dirname, "public")));
app.use(express.urlencoded({ extended: true, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(sessionMiddleware);
app.use(passportInitialize);
app.use(passportSession);
app.use(csrfProtection);
app.use(exposeCurrentUser);

app.use("/", authRouter);

// Everything below requires a signed-in user.
app.use(ensureAuthenticated);
app.use("/", homeRouter);
app.use("/staff", staffRouter);

app.use(notFound);
app.use(errorHandler);

try {
  await seedUsers();
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
