import { body, param } from "express-validator";

export const createUser = [
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
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const updateUser = [
  param("id").isInt({ min: 1 }).withMessage("Valid user ID is required"),
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
  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be a boolean"),
];

export const assignRole = [
  param("id").isInt({ min: 1 }).withMessage("Valid user ID is required"),
  body("roleId")
    .customSanitizer((value, { req }) => value ?? req.body.role_id)
    .isInt({ min: 1 })
    .withMessage("Valid role ID is required"),
];

export const removeRole = [
  param("id").isInt({ min: 1 }).withMessage("Valid user ID is required"),
  body("roleId")
    .customSanitizer((value, { req }) => value ?? req.body.role_id)
    .isInt({ min: 1 })
    .withMessage("Valid role ID is required"),
];

export const getUserById = [
  param("id").isInt({ min: 1 }).withMessage("Valid user ID is required"),
];

export const deleteUser = [
  param("id").isInt({ min: 1 }).withMessage("Valid user ID is required"),
];
