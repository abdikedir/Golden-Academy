import { body, param } from "express-validator";

export const createClass = [
  body("section")
    .trim()
    .notEmpty()
    .withMessage("Section is required")
    .isLength({ min: 1, max: 1 })
    .withMessage("Section must be one letter")
    .matches(/^[A-Za-z]$/)
    .withMessage("Section must be A-Z")
    .customSanitizer((value) => String(value).toUpperCase()),
  body("className")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Class name cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Class name must be between 1 and 100 characters"),
  body("grade")
    .trim()
    .notEmpty()
    .withMessage("Grade is required")
    .isIn(["9", "10", "11", "12"])
    .withMessage("Grade must be one of 9, 10, 11, 12"),
  body("termId").isInt({ min: 1 }).withMessage("Valid term ID is required"),
  body("homeroomTeacherId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid homeroom teacher ID is required"),
];

export const updateClass = [
  param("id").isInt({ min: 1 }).withMessage("Valid class ID is required"),
  body("section")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Section cannot be empty")
    .isLength({ min: 1, max: 1 })
    .withMessage("Section must be one letter")
    .matches(/^[A-Za-z]$/)
    .withMessage("Section must be A-Z")
    .customSanitizer((value) => String(value).toUpperCase()),
  body("className")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Class name cannot be empty")
    .isLength({ min: 1, max: 100 })
    .withMessage("Class name must be between 1 and 100 characters"),
  body("grade")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Grade cannot be empty")
    .isIn(["9", "10", "11", "12"])
    .withMessage("Grade must be one of 9, 10, 11, 12"),
  body("termId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid term ID is required"),
  body("homeroomTeacherId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid homeroom teacher ID is required"),
];

export const publishResults = [
  param("id").isInt({ min: 1 }).withMessage("Valid class ID is required"),
];

export const getClassById = [
  param("id").isInt({ min: 1 }).withMessage("Valid class ID is required"),
];

export const deleteClass = [
  param("id").isInt({ min: 1 }).withMessage("Valid class ID is required"),
];

export const addClassSubject = [
  param("id").isInt({ min: 1 }).withMessage("Valid class ID is required"),
  body("subjectId")
    .customSanitizer((value, { req }) => value ?? req.body.subject_id)
    .isInt({ min: 1 })
    .withMessage("Valid subject ID is required"),
];

export const removeClassSubject = [
  param("id").isInt({ min: 1 }).withMessage("Valid class ID is required"),
  param("subjectId")
    .isInt({ min: 1 })
    .withMessage("Valid subject ID is required"),
];
