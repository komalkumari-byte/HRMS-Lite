import express from 'express';
import {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  deleteDepartment
} from '../controllers/departmentController.js';
import { validate, departmentValidation, idValidation } from '../middleware/validation.js';

const router = express.Router();

// RESTful API routes
router.get('/', getAllDepartments);
router.get('/:id', validate(idValidation), getDepartmentById);
router.post('/', validate(departmentValidation), createDepartment);
router.put('/:id', validate([...idValidation, ...departmentValidation]), updateDepartment);
router.delete('/:id', validate(idValidation), deleteDepartment);

export default router;