import { param, query } from "express-validator";

export const validateId = [
  param("id").isInt({ min: 1 }).withMessage("Valid ID is required"),
];

export const validatePagination = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage("Limit must be between 1 and 1000"),
];
