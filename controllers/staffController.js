import { getAllUsers, createUser } from "../services/userService.js";
import { ROLES } from "../services/constants.js";
import { ValidationError } from "../services/errors.js";

const renderStaffPage = (res, extra = {}) =>
  res.render("staff.ejs", {
    title: "Staff",
    staff: getAllUsers(),
    roles: Object.values(ROLES),
    form: {},
    ...extra
  });

export function listStaff(req, res, next) {
  try {
    renderStaffPage(res, { added: req.query.added });
  } catch (error) {
    next(error);
  }
}

export async function addStaff(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const user = await createUser({ name, email, password, role });
    res.redirect(`/staff?added=${encodeURIComponent(user.name)}`);
  } catch (error) {
    if (error instanceof ValidationError) {
      const { name, email, role } = req.body;
      return res.status(error.status).render("staff.ejs", {
        title: "Staff",
        staff: getAllUsers(),
        roles: Object.values(ROLES),
        form: { name, email, role },
        error: error.message
      });
    }
    next(error);
  }
}
