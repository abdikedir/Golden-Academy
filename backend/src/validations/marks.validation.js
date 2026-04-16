import { body, param, query } from "express-validator";

export const submitMarks = [
  body("studentId")
    .customSanitizer((value, { req }) => value ?? req.body.student_id)
    .isInt({ min: 1 })
    .withMessage("Valid student ID is required"),
  body("enrollmentId")
    .customSanitizer((value, { req }) => value ?? req.body.enrollment_id)
    .isInt({ min: 1 })
    .withMessage("Valid enrollment ID is required"),
  body("subjectId")
    .customSanitizer((value, { req }) => value ?? req.body.subject_id)
    .isInt({ min: 1 })
    .withMessage("Valid subject ID is required"),
  body("markObtained")
    .customSanitizer((value, { req }) => value ?? req.body.mark_obtained)
    .isInt({ min: 1, max: 100 })
    .withMessage("Mark must be between 1 and 100"),
  body("teacherId")
    .customSanitizer((value, { req }) => value ?? req.body.teacher_id)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid teacher ID is required"),
];

export const getClassMarks = [
  param("classId").isInt({ min: 1 }).withMessage("Valid class ID is required"),
  query("termId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid term ID is required"),
];

export const getStudentMarks = [
  param("studentId")
    .isInt({ min: 1 })
    .withMessage("Valid student ID is required"),
  query("termId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid term ID is required"),
];

export const getMarkById = [
  param("id").isInt({ min: 1 }).withMessage("Valid mark ID is required"),
];

export const updateMark = [
  param("id").isInt({ min: 1 }).withMessage("Valid mark ID is required"),
  body("markObtained")
    .customSanitizer((value, { req }) => value ?? req.body.mark_obtained)
    .isInt({ min: 1, max: 100 })
    .withMessage("Mark must be between 1 and 100"),
  body("teacherId")
    .customSanitizer((value, { req }) => value ?? req.body.teacher_id)
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid teacher ID is required"),
];
