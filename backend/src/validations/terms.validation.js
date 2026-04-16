import { body, param } from "express-validator";

export const createTerm = [
  body("academicYear")
    .customSanitizer((value, { req }) => value ?? req.body.academic_year)
    .trim()
    .notEmpty()
    .withMessage("Academic year is required")
    .matches(/^(\d{4}-\d{4}|\d{4})$/)
    .withMessage(
      "Academic year must be in format YYYY or YYYY-YYYY (e.g., 2024 or 2023-2024)",
    ),
  body("semester")
    .customSanitizer((value) => {
      if (value === "S1") return "I";
      if (value === "S2") return "II";
      return value;
    })
    .trim()
    .notEmpty()
    .withMessage("Semester is required")
    .isIn(["I", "II"])
    .withMessage("Semester must be I or II"),
];

export const updateTerm = [
  param("id").isInt({ min: 1 }).withMessage("Valid term ID is required"),
  body("academicYear")
    .customSanitizer((value, { req }) => value ?? req.body.academic_year)
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Academic year cannot be empty")
    .matches(/^(\d{4}-\d{4}|\d{4})$/)
    .withMessage(
      "Academic year must be in format YYYY or YYYY-YYYY (e.g., 2024 or 2023-2024)",
    ),
  body("semester")
    .customSanitizer((value) => {
      if (value === "S1") return "I";
      if (value === "S2") return "II";
      return value;
    })
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Semester cannot be empty")
    .isIn(["I", "II"])
    .withMessage("Semester must be I or II"),
];

export const getTermById = [
  param("id").isInt({ min: 1 }).withMessage("Valid term ID is required"),
];

export const deleteTerm = [
  param("id").isInt({ min: 1 }).withMessage("Valid term ID is required"),
];
