import db from '../config/database.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';

export const getAllDepartments = async (req, res, next) => {
  try {
    const departments = await db.all(
      `SELECT d.*, COUNT(e.id) as employee_count 
       FROM departments d 
       LEFT JOIN employees e ON d.id = e.department_id 
       GROUP BY d.id 
       ORDER BY d.name`
    );
    res.status(200).json({
      success: true,
      data: departments,
      count: departments.length
    });
  } catch (error) {
    next(error);
  }
};

export const getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deptId = parseInt(id);
    
    if (isNaN(deptId) || deptId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid department ID',
        details: [{ field: 'id', message: 'Department ID must be a positive integer' }]
      });
    }

    const department = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);

    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Get employees in this department
    const employees = await db.all(
      'SELECT id, first_name, last_name, email, position FROM employees WHERE department_id = ?',
      [deptId]
    );
    department.employees = employees;

    res.status(200).json({
      success: true,
      data: department
    });
  } catch (error) {
    next(error);
  }
};

export const createDepartment = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    // Check if department already exists (duplicate handling)
    const existing = await db.get('SELECT * FROM departments WHERE LOWER(name) = LOWER(?)', [name.trim()]);
    if (existing) {
      throw new ConflictError('Department with this name already exists');
    }

    const result = await db.run(
      'INSERT INTO departments (name, description) VALUES (?, ?)',
      [name.trim(), description ? description.trim() : null]
    );

    const department = await db.get('SELECT * FROM departments WHERE id = ?', [result.lastID]);
    
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

export const updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deptId = parseInt(id);
    
    if (isNaN(deptId) || deptId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid department ID',
        details: [{ field: 'id', message: 'Department ID must be a positive integer' }]
      });
    }

    const { name, description } = req.body;

    const existing = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
    if (!existing) {
      throw new NotFoundError('Department not found');
    }

    // Check if name is taken by another department (duplicate handling)
    if (name && name.trim().toLowerCase() !== existing.name.toLowerCase()) {
      const nameExists = await db.get('SELECT * FROM departments WHERE LOWER(name) = LOWER(?) AND id != ?', [name.trim(), deptId]);
      if (nameExists) {
        throw new ConflictError('Department name already taken');
      }
    }

    await db.run(
      'UPDATE departments SET name = ?, description = ? WHERE id = ?',
      [name ? name.trim() : existing.name, description !== undefined ? (description ? description.trim() : null) : existing.description, deptId]
    );

    const department = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
    
    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    next(error);
  }
};

export const deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const deptId = parseInt(id);
    
    if (isNaN(deptId) || deptId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid department ID',
        details: [{ field: 'id', message: 'Department ID must be a positive integer' }]
      });
    }

    const department = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
    if (!department) {
      throw new NotFoundError('Department not found');
    }

    // Check if department has employees
    const employeeCount = await db.get(
      'SELECT COUNT(*) as count FROM employees WHERE department_id = ?',
      [deptId]
    );

    if (employeeCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Cannot delete department with assigned employees',
        details: [{ 
          field: 'department_id', 
          message: `Department has ${employeeCount.count} employee(s). Please reassign employees first.` 
        }]
      });
    }

    await db.run('DELETE FROM departments WHERE id = ?', [deptId]);
    
    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};