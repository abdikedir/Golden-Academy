import { body, param, query } from "express-validator";

export const enrollStudent = [
  body("studentId").customSanitizer(
    (value, { req }) => value ?? req.body.student_id,
  ),
  body("classId").customSanitizer(
    (value, { req }) => value ?? req.body.class_id,
  ),
  body("studentId")
    .isInt({ min: 1 })
    .withMessage("Valid student ID is required"),
  body("classId").isInt({ min: 1 }).withMessage("Valid class ID is required"),
];

export const promoteStudents = [
  body("currentClassId")
    .isInt({ min: 1 })
    .withMessage("Valid current class ID is required"),
  body("nextClassId")
    .isInt({ min: 1 })
    .withMessage("Valid next class ID is required"),
  body("nextTermId")
    .isInt({ min: 1 })
    .withMessage("Valid next term ID is required"),
];

export const getEnrollmentHistory = [
  param("studentId")
    .isInt({ min: 1 })
    .withMessage("Valid student ID is required"),
];

export const listEnrollments = [
  query("classId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid class ID is required"),
  query("termId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid term ID is required"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),
];
