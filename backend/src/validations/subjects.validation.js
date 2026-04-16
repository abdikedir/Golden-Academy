import { body, param } from 'express-validator';

export const createSubject = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Subject name is required')
    .isLength({ min: 1, max: 255 })
    .withMessage('Subject name must be between 1 and 255 characters'),
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Subject code is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Subject code must be between 1 and 50 characters'),
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required'),
  body('totalMark')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total mark must be between 1 and 1000')
];

export const updateSubject = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subject ID is required'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject name cannot be empty')
    .isLength({ min: 1, max: 255 })
    .withMessage('Subject name must be between 1 and 255 characters'),
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Subject code cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Subject code must be between 1 and 50 characters'),
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Valid department ID is required'),
  body('totalMark')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Total mark must be between 1 and 1000')
];

export const getSubjectById = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subject ID is required')
];

export const deleteSubject = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subject ID is required')
];
