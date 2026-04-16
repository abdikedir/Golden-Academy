import { body, param } from "express-validator";

export const createTeacher = [
  body("userId")
    .customSanitizer((value, { req }) => value ?? req.body.user_id)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  body("departmentId")
    .customSanitizer((value, { req }) => value ?? req.body.department_id)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid department ID is required"),
  body("fullName")
    .customSanitizer((value, { req }) => value ?? req.body.full_name)
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Full name must be between 1 and 255 characters"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Valid email is required")
    .normalizeEmail(),
  body("password")
    .optional()
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters long")
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    ),
  body("roleName")
    .customSanitizer((value, { req }) => value ?? req.body.role_name)
    .optional()
    .isIn(["TEACHER", "DEPARTMENT_ADMIN", "REGISTRAR"])
    .withMessage("Role must be TEACHER, DEPARTMENT_ADMIN, or REGISTRAR"),
  body().custom((_, { req }) => {
    const hasLinkedUser =
      req.body.userId !== undefined &&
      req.body.userId !== null &&
      req.body.userId !== "";

    if (!hasLinkedUser) {
      if (!req.body.email) {
        throw new Error("Email is required when userId is not provided");
      }
      if (!req.body.password) {
        throw new Error("Password is required when userId is not provided");
      }
    }

    return true;
  }),
];

export const updateTeacher = [
  param("id").isInt({ min: 1 }).withMessage("Valid teacher ID is required"),
  body("userId")
    .customSanitizer((value, { req }) => value ?? req.body.user_id)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  body("departmentId")
    .customSanitizer((value, { req }) => value ?? req.body.department_id)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid department ID is required"),
  body("fullName")
    .customSanitizer((value, { req }) => value ?? req.body.full_name)
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Full name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Full name must be between 1 and 255 characters"),
];

export const assignTeacherToSubject = [
  param("id").isInt({ min: 1 }).withMessage("Valid teacher ID is required"),
  body("classSubjectId")
    .isInt({ min: 1 })
    .withMessage("Valid class subject ID is required"),
];

export const getTeacherById = [
  param("id").isInt({ min: 1 }).withMessage("Valid teacher ID is required"),
];

export const deleteTeacher = [
  param("id").isInt({ min: 1 }).withMessage("Valid teacher ID is required"),
];
