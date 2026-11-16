// One-time message shown on the next page after a redirect, e.g. "Task marked done."
// Kept in the session so the text never travels in the URL.
export const exposeFlash = (req, res, next) => {
  res.locals.flash = req.session.flash || null;
  delete req.session.flash;
  next();
};

export const setFlash = (req, type, text) => {
  req.session.flash = { type, text };
};
