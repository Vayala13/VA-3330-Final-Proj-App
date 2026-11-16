export const notFound = (req, res, next) => {
  const error = new Error("Page not found.");
  error.status = 404;
  next(error);
};

// Server errors (500+) show a generic message so internal details and stack traces never reach the browser.
export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  const status = err.status || 500;
  if (status >= 500) {
    console.error(err);
  }

  const message = status < 500 ? err.message : "Something went wrong. Please try again.";

  res.status(status).render("error.ejs", { title: `Error ${status}`, status, message });
};
