import { body, param } from 'express-validator';

export const createDepartment = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Department name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Department name must be between 1 and 255 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Department code is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Department code must be between 1 and 50 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Department code must contain only uppercase letters, numbers, hyphens, and underscores')
];

export const updateDepartment = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department name cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Department name must be between 1 and 255 characters'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Department code cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Department code must be between 1 and 50 characters')
    .matches(/^[A-Z0-9_-]+$/)
    .withMessage('Department code must contain only uppercase letters, numbers, hyphens, and underscores')
];

export const getDepartmentById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required')
];

export const deleteDepartment = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required')
];
