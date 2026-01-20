import jwt from 'jsonwebtoken';
import db from '../config/database.js';
import { UnauthorizedError } from './errorHandler.js';

export const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Access token required. Please provide a valid authentication token.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = await db.get('SELECT id, email, name, role FROM users WHERE id = ?', [decoded.userId]);
    
    if (!user) {
      throw new UnauthorizedError('Invalid or expired token');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid or expired token. Please login again.'
      });
    }
    next(error);
  }
};