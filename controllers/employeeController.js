import db from '../config/database.js';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler.js';

export const getAllEmployees = async (req, res, next) => {
  try {
    const { search, department_id, status } = req.query;
    let query = `
      SELECT e.*, d.name as department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.email LIKE ? OR e.position LIKE ?)`;
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    if (department_id) {
      // Validate department_id if provided
      const deptId = parseInt(department_id);
      if (isNaN(deptId) || deptId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid department ID',
          details: [{ field: 'department_id', message: 'Department ID must be a positive integer' }]
        });
      }
      query += ` AND e.department_id = ?`;
      params.push(deptId);
    }

    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid status value',
          details: [{ field: 'status', message: 'Status must be either "active" or "inactive"' }]
        });
      }
      query += ` AND e.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY e.created_at DESC`;

    const employees = await db.all(query, params);
    
    res.status(200).json({
      success: true,
      data: employees,
      count: employees.length
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate ID
    const employeeId = parseInt(id);
    if (isNaN(employeeId) || employeeId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'id', message: 'Employee ID must be a positive integer' }]
      });
    }

    const employee = await db.get(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.id = ?`,
      [employeeId]
    );

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    res.status(200).json({
      success: true,
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

export const createEmployee = async (req, res, next) => {
  try {
    const {
      first_name,
      last_name,
      email,
      phone,
      position,
      department_id,
      hire_date,
      salary,
      status
    } = req.body;

    // Check if email already exists (duplicate handling)
    const existing = await db.get('SELECT * FROM employees WHERE email = ?', [email]);
    if (existing) {
      throw new ConflictError('Employee with this email already exists');
    }

    // Validate department_id if provided
    if (department_id) {
      const deptId = parseInt(department_id);
      if (isNaN(deptId) || deptId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid department ID',
          details: [{ field: 'department_id', message: 'Department ID must be a positive integer' }]
        });
      }
      
      const department = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
      if (!department) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Department not found',
          details: [{ field: 'department_id', message: 'The specified department does not exist' }]
        });
      }
    }

    // Validate hire_date if provided
    if (hire_date) {
      const hireDate = new Date(hire_date);
      if (isNaN(hireDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid hire date',
          details: [{ field: 'hire_date', message: 'Hire date must be a valid date' }]
        });
      }
      
      // Check if hire date is in the future
      if (hireDate > new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Hire date cannot be in the future',
          details: [{ field: 'hire_date', message: 'Hire date must be today or in the past' }]
        });
      }
    }

    const result = await db.run(
      `INSERT INTO employees 
       (first_name, last_name, email, phone, position, department_id, hire_date, salary, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        first_name.trim(),
        last_name.trim(),
        email.toLowerCase().trim(),
        phone ? phone.trim() : null,
        position.trim(),
        department_id ? parseInt(department_id) : null,
        hire_date || null,
        salary ? parseFloat(salary) : null,
        status || 'active'
      ]
    );

    const employee = await db.get(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeId = parseInt(id);
    
    // Validate ID
    if (isNaN(employeeId) || employeeId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'id', message: 'Employee ID must be a positive integer' }]
      });
    }

    const {
      first_name,
      last_name,
      email,
      phone,
      position,
      department_id,
      hire_date,
      salary,
      status
    } = req.body;

    // Check if employee exists
    const existing = await db.get('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!existing) {
      throw new NotFoundError('Employee not found');
    }

    // Check if email is taken by another employee (duplicate handling)
    if (email && email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const emailExists = await db.get('SELECT * FROM employees WHERE email = ? AND id != ?', [email.toLowerCase().trim(), employeeId]);
      if (emailExists) {
        throw new ConflictError('Email already taken by another employee');
      }
    }

    // Validate department_id if provided
    if (department_id) {
      const deptId = parseInt(department_id);
      if (isNaN(deptId) || deptId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid department ID',
          details: [{ field: 'department_id', message: 'Department ID must be a positive integer' }]
        });
      }
      
      const department = await db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
      if (!department) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Department not found',
          details: [{ field: 'department_id', message: 'The specified department does not exist' }]
        });
      }
    }

    // Validate hire_date if provided
    if (hire_date) {
      const hireDate = new Date(hire_date);
      if (isNaN(hireDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid hire date',
          details: [{ field: 'hire_date', message: 'Hire date must be a valid date' }]
        });
      }
    }

    await db.run(
      `UPDATE employees 
       SET first_name = ?, last_name = ?, email = ?, phone = ?, position = ?, 
           department_id = ?, hire_date = ?, salary = ?, status = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        first_name ? first_name.trim() : existing.first_name,
        last_name ? last_name.trim() : existing.last_name,
        email ? email.toLowerCase().trim() : existing.email,
        phone !== undefined ? (phone ? phone.trim() : null) : existing.phone,
        position ? position.trim() : existing.position,
        department_id ? parseInt(department_id) : existing.department_id,
        hire_date || existing.hire_date,
        salary !== undefined ? (salary ? parseFloat(salary) : null) : existing.salary,
        status || existing.status,
        employeeId
      ]
    );

    const employee = await db.get(
      `SELECT e.*, d.name as department_name 
       FROM employees e 
       LEFT JOIN departments d ON e.department_id = d.id 
       WHERE e.id = ?`,
      [employeeId]
    );

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: employee
    });
  } catch (error) {
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    const employeeId = parseInt(id);
    
    // Validate ID
    if (isNaN(employeeId) || employeeId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'id', message: 'Employee ID must be a positive integer' }]
      });
    }

    const employee = await db.get('SELECT * FROM employees WHERE id = ?', [employeeId]);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Check if employee has attendance records
    const attendanceCount = await db.get(
      'SELECT COUNT(*) as count FROM attendance WHERE employee_id = ?',
      [employeeId]
    );

    if (attendanceCount.count > 0) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Cannot delete employee with attendance records',
        details: [{ 
          field: 'employee_id', 
          message: `Employee has ${attendanceCount.count} attendance record(s). Please delete attendance records first.` 
        }]
      });
    }

    await db.run('DELETE FROM employees WHERE id = ?', [employeeId]);
    
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};