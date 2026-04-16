import { body, param, query } from "express-validator";

export const createStudent = [
  body("studentSchoolId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Student school ID cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Student school ID must be between 1 and 50 characters"),
  body("fullName")
    .trim()
    .notEmpty()
    .withMessage("Full name is required")
    .isLength({ min: 1, max: 255 })
    .withMessage("Full name must be between 1 and 255 characters"),
  body("gender")
    .optional()
    .isIn(["M", "F"])
    .withMessage("Gender must be M or F"),
];

export const updateStudent = [
  param("id").isInt({ min: 1 }).withMessage("Valid student ID is required"),
  body("studentSchoolId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Student school ID cannot be empty")
    .isLength({ min: 1, max: 50 })
    .withMessage("Student school ID must be between 1 and 50 characters"),
  body("fullName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Full name cannot be empty")
    .isLength({ min: 1, max: 255 })
    .withMessage("Full name must be between 1 and 255 characters"),
  body("gender")
    .optional()
    .isIn(["M", "F"])
    .withMessage("Gender must be M or F"),
];

export const enrollStudent = [
  param("id").isInt({ min: 1 }).withMessage("Valid student ID is required"),
  body("classId").isInt({ min: 1 }).withMessage("Valid class ID is required"),
];

export const getStudentById = [
  param("id").isInt({ min: 1 }).withMessage("Valid student ID is required"),
];

export const deleteStudent = [
  param("id").isInt({ min: 1 }).withMessage("Valid student ID is required"),
];

export const searchStudents = [
  query("search")
    .optional()
    .trim()
    .isLength({ min: 1 })
    .withMessage("Search term cannot be empty"),
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),
];
