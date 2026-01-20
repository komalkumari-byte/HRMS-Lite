import express from 'express';
import {
  getAllAttendance,
  getAttendanceById,
  createAttendance,
  updateAttendance,
  deleteAttendance,
  markAttendance,
  getAttendanceStats
} from '../controllers/attendanceController.js';
import { body } from 'express-validator';
import { validate, attendanceValidation, idValidation } from '../middleware/validation.js';

const router = express.Router();

// Mark attendance validation
const markAttendanceValidation = [
  attendanceValidation[0], // employee_id
  attendanceValidation[1], // date
  body('action').isIn(['check_in', 'check_out']).withMessage('Action must be check_in or check_out')
];

// RESTful API routes
router.get('/', getAllAttendance);
router.get('/stats', getAttendanceStats);
router.get('/:id', validate(idValidation), getAttendanceById);
router.post('/', validate(attendanceValidation), createAttendance);
router.post('/mark', validate(markAttendanceValidation), markAttendance);
router.put('/:id', validate([...idValidation, ...attendanceValidation]), updateAttendance);
router.delete('/:id', validate(idValidation), deleteAttendance);

export default router;
