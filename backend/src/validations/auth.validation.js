import { body } from "express-validator";

export const register = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  body("roleName")
    .optional()
    .isIn(["TEACHER", "DEPARTMENT_ADMIN", "REGISTRAR"])
    .withMessage("Role must be TEACHER, DEPARTMENT_ADMIN, or REGISTRAR"),
  body("fullName")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Full name cannot be empty"),
];

export const login = [
  body("email")
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];
