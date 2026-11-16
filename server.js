import express from "express";
import path from "node:path";
import homeRouter from "./routes/home.js";

const app = express();
const port = process.env.PORT || 3000;

app.set("views", path.join(import.meta.dirname, "views"));

app.use(express.static(path.join(import.meta.dirname, "public")));

app.use("/", homeRouter);

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
