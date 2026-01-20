import express from 'express';
import { register, login } from '../controllers/authController.js';
import { validate, registerValidation, loginValidation } from '../middleware/validation.js';

const router = express.Router();

router.post('/register', validate(registerValidation), register);
router.post('/login', validate(loginValidation), login);

export default router;