import express from 'express';
import {
  getAllEmployees,
  getEmployeeById,
  createEmployee,
  updateEmployee,
  deleteEmployee
} from '../controllers/employeeController.js';
import { validate, employeeValidation, idValidation } from '../middleware/validation.js';

const router = express.Router();

// RESTful API routes
router.get('/', getAllEmployees);
router.get('/:id', validate(idValidation), getEmployeeById);
router.post('/', validate(employeeValidation), createEmployee);
router.put('/:id', validate([...idValidation, ...employeeValidation]), updateEmployee);
router.delete('/:id', validate(idValidation), deleteEmployee);

export default router;