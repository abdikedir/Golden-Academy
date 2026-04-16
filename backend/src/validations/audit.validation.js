import { body, param, query } from "express-validator";
import { validatePagination } from "./common.validation.js";

export const listAuditLogs = [
  ...validatePagination,
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  query("action")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Action is required"),
  query("resourceType")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type is required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
];

export const getAuditLog = [
  param("id").isInt({ min: 1 }).withMessage("Valid audit log ID is required"),
];

export const getUserAuditLogs = [
  ...validatePagination,
  param("userId").isInt({ min: 1 }).withMessage("Valid user ID is required"),
  query("action")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Action is required"),
  query("resourceType")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type is required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
];

export const getActionAuditLogs = [
  ...validatePagination,
  param("action")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Action is required"),
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  query("resourceType")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type is required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
];

export const getResourceTypeAuditLogs = [
  ...validatePagination,
  param("resourceType")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type is required"),
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  query("action")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Action is required"),
  query("startDate")
    .optional()
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate")
    .optional()
    .isISO8601()
    .withMessage("End date must be a valid ISO date"),
];

export const getDateRangeAuditLogs = [
  ...validatePagination,
  query("startDate")
    .isISO8601()
    .withMessage("Start date must be a valid ISO date"),
  query("endDate").isISO8601().withMessage("End date must be a valid ISO date"),
  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  query("action")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Action is required"),
  query("resourceType")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type is required"),
];

export const exportAuditLogs = [
  ...listAuditLogs,
  query("limit")
    .optional()
    .isInt({ min: 1, max: 5000 })
    .withMessage("Limit must be between 1 and 5000"),
];

export const createAuditLog = [
  body("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  body("action").isString().trim().notEmpty().withMessage("Action is required"),
  body("resourceType")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type is required"),
  body("resourceId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Resource ID must be a positive integer"),
  body("ipAddress")
    .optional({ nullable: true })
    .isIP()
    .withMessage("IP address must be a valid IP address"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
];

export const updateAuditLog = [
  param("id").isInt({ min: 1 }).withMessage("Valid audit log ID is required"),
  body("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Valid user ID is required"),
  body("action")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Action cannot be empty"),
  body("resourceType")
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage("Resource type cannot be empty"),
  body("resourceId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Resource ID must be a positive integer"),
  body("ipAddress")
    .optional({ nullable: true })
    .isIP()
    .withMessage("IP address must be a valid IP address"),
  body("metadata")
    .optional()
    .isObject()
    .withMessage("Metadata must be an object"),
  body().custom((value) => {
    const hasUpdatableField =
      value.userId !== undefined ||
      value.action !== undefined ||
      value.resourceType !== undefined ||
      value.resourceId !== undefined ||
      value.ipAddress !== undefined ||
      value.metadata !== undefined;

    if (!hasUpdatableField) {
      throw new Error("At least one field is required for update");
    }

    return true;
  }),
];

export const deleteAuditLog = [
  param("id").isInt({ min: 1 }).withMessage("Valid audit log ID is required"),
];
