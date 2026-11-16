export function showHome(req, res, next) {
  try {
    res.render("home.ejs", { title: "Home" });
  } catch (error) {
    next(error);
  }
}
