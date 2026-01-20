import { body, param, query, validationResult } from 'express-validator';
import { ValidationError } from './errorHandler.js';

/**
 * Enhanced validation middleware
 * Formats validation errors consistently
 */
export const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map(validation => validation.run(req)));

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const formattedErrors = errors.array().map(err => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value
      }));

      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid input data',
        details: formattedErrors
      });
    }
    next();
  };
};

/**
 * Employee validation rules
 */
export const employeeValidation = [
  body('first_name')
    .trim()
    .notEmpty().withMessage('First name is required')
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('last_name')
    .trim()
    .notEmpty().withMessage('Last name is required')
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
  
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email must not exceed 100 characters'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\s\-\+\(\)]+$/).withMessage('Invalid phone number format')
    .isLength({ max: 20 }).withMessage('Phone number must not exceed 20 characters'),
  
  body('position')
    .trim()
    .notEmpty().withMessage('Position is required')
    .isLength({ min: 2, max: 100 }).withMessage('Position must be between 2 and 100 characters'),
  
  body('department_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Department ID must be a positive integer'),
  
  body('hire_date')
    .optional()
    .isISO8601().withMessage('Hire date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  
  body('salary')
    .optional()
    .isFloat({ min: 0 }).withMessage('Salary must be a positive number')
    .toFloat(),
  
  body('status')
    .optional()
    .isIn(['active', 'inactive']).withMessage('Status must be either "active" or "inactive"')
];

/**
 * Department validation rules
 */
export const departmentValidation = [
  body('name')
    .trim()
    .notEmpty().withMessage('Department name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Department name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-&]+$/).withMessage('Department name contains invalid characters'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Description must not exceed 500 characters')
];

/**
 * Auth validation rules
 */
export const registerValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail()
    .isLength({ max: 100 }).withMessage('Email must not exceed 100 characters'),
  
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .isLength({ max: 100 }).withMessage('Password must not exceed 100 characters'),
  
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z\s'-]+$/).withMessage('Name can only contain letters, spaces, hyphens, and apostrophes')
];

export const loginValidation = [
  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Password is required')
];

/**
 * Attendance validation rules
 */
export const attendanceValidation = [
  body('employee_id')
    .notEmpty().withMessage('Employee ID is required')
    .isInt({ min: 1 }).withMessage('Employee ID must be a positive integer'),
  
  body('date')
    .notEmpty().withMessage('Date is required')
    .isISO8601().withMessage('Date must be a valid date (YYYY-MM-DD)')
    .toDate(),
  
  body('check_in')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Check-in time must be in HH:MM:SS format'),
  
  body('check_out')
    .optional()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).withMessage('Check-out time must be in HH:MM:SS format'),
  
  body('status')
    .optional()
    .isIn(['present', 'absent', 'late', 'half_day']).withMessage('Status must be one of: present, absent, late, half_day'),
  
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
];

/**
 * ID parameter validation
 */
export const idValidation = [
  param('id')
    .notEmpty().withMessage('ID is required')
    .isInt({ min: 1 }).withMessage('ID must be a positive integer')
];

/**
 * Query parameter validation
 */
export const queryValidation = {
  date: query('date').optional().isISO8601().withMessage('Date must be in YYYY-MM-DD format'),
  employee_id: query('employee_id').optional().isInt({ min: 1 }).withMessage('Employee ID must be a positive integer'),
  status: query('status').optional().isIn(['active', 'inactive']).withMessage('Status must be active or inactive'),
  search: query('search').optional().trim().isLength({ max: 100 }).withMessage('Search term must not exceed 100 characters')
};
