import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';

export const getAllEmployees = async (req, res, next) => {
  try {
    const { search, department_id, status } = req.query;
    
    let query = {};
    
    // Build search query
    if (search) {
      query.$or = [
        { first_name: { $regex: search, $options: 'i' } },
        { last_name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { position: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by department
    if (department_id) {
      // Validate MongoDB ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(department_id)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid department ID',
          details: [{ field: 'department_id', message: 'Department ID must be a valid MongoDB ObjectId' }]
        });
      }
      query.department_id = department_id;
    }

    // Filter by status
    if (status) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid status value',
          details: [{ field: 'status', message: 'Status must be either "active" or "inactive"' }]
        });
      }
      query.status = status;
    }

    const employees = await Employee.find(query)
      .populate('department_id', 'name')
      .sort({ createdAt: -1 })
      .lean();

    // Transform to match expected format
    const formattedEmployees = employees.map(emp => ({
      ...emp,
      id: emp._id,
      department_name: emp.department_id?.name || null,
      department_id: emp.department_id?._id || null
    }));

    res.status(200).json({
      success: true,
      data: formattedEmployees,
      count: formattedEmployees.length
    });
  } catch (error) {
    next(error);
  }
};

export const getEmployeeById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'id', message: 'Employee ID must be a valid MongoDB ObjectId' }]
      });
    }

    const employee = await Employee.findById(id)
      .populate('department_id', 'name')
      .lean();

    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Transform to match expected format
    const formattedEmployee = {
      ...employee,
      id: employee._id,
      department_name: employee.department_id?.name || null,
      department_id: employee.department_id?._id || null
    };

    res.status(200).json({
      success: true,
      data: formattedEmployee
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

    // Check if email already exists
    const existing = await Employee.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      throw new ConflictError('Employee with this email already exists');
    }

    // Validate department_id if provided
    if (department_id) {
      if (!/^[0-9a-fA-F]{24}$/.test(department_id)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid department ID',
          details: [{ field: 'department_id', message: 'Department ID must be a valid MongoDB ObjectId' }]
        });
      }
      
      const department = await Department.findById(department_id);
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
      
      if (hireDate > new Date()) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Hire date cannot be in the future',
          details: [{ field: 'hire_date', message: 'Hire date must be today or in the past' }]
        });
      }
    }

    const employee = new Employee({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : null,
      position: position.trim(),
      department_id: department_id || null,
      hire_date: hire_date || null,
      salary: salary ? parseFloat(salary) : null,
      status: status || 'active'
    });

    await employee.save();

    const savedEmployee = await Employee.findById(employee._id)
      .populate('department_id', 'name')
      .lean();

    const formattedEmployee = {
      ...savedEmployee,
      id: savedEmployee._id,
      department_name: savedEmployee.department_id?.name || null,
      department_id: savedEmployee.department_id?._id || null
    };

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: formattedEmployee
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ConflictError('Employee with this email already exists'));
    }
    next(error);
  }
};

export const updateEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'id', message: 'Employee ID must be a valid MongoDB ObjectId' }]
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
    const existing = await Employee.findById(id);
    if (!existing) {
      throw new NotFoundError('Employee not found');
    }

    // Check if email is taken by another employee
    if (email && email.toLowerCase().trim() !== existing.email.toLowerCase()) {
      const emailExists = await Employee.findOne({ 
        email: email.toLowerCase().trim(), 
        _id: { $ne: id } 
      });
      if (emailExists) {
        throw new ConflictError('Email already taken by another employee');
      }
    }

    // Validate department_id if provided
    if (department_id) {
      if (!/^[0-9a-fA-F]{24}$/.test(department_id)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid department ID',
          details: [{ field: 'department_id', message: 'Department ID must be a valid MongoDB ObjectId' }]
        });
      }
      
      const department = await Department.findById(department_id);
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

    // Update employee
    if (first_name) existing.first_name = first_name.trim();
    if (last_name) existing.last_name = last_name.trim();
    if (email) existing.email = email.toLowerCase().trim();
    if (phone !== undefined) existing.phone = phone ? phone.trim() : null;
    if (position) existing.position = position.trim();
    if (department_id !== undefined) existing.department_id = department_id || null;
    if (hire_date !== undefined) existing.hire_date = hire_date || null;
    if (salary !== undefined) existing.salary = salary ? parseFloat(salary) : null;
    if (status) existing.status = status;

    await existing.save();

    const updatedEmployee = await Employee.findById(id)
      .populate('department_id', 'name')
      .lean();

    const formattedEmployee = {
      ...updatedEmployee,
      id: updatedEmployee._id,
      department_name: updatedEmployee.department_id?.name || null,
      department_id: updatedEmployee.department_id?._id || null
    };

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: formattedEmployee
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ConflictError('Email already taken by another employee'));
    }
    next(error);
  }
};

export const deleteEmployee = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'id', message: 'Employee ID must be a valid MongoDB ObjectId' }]
      });
    }

    const employee = await Employee.findById(id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Check if employee has attendance records
    const Attendance = (await import('../models/Attendance.js')).default;
    const attendanceCount = await Attendance.countDocuments({ employee_id: id });

    if (attendanceCount > 0) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'Cannot delete employee with attendance records',
        details: [{ 
          field: 'employee_id', 
          message: `Employee has ${attendanceCount} attendance record(s). Please delete attendance records first.` 
        }]
      });
    }

    await Employee.findByIdAndDelete(id);
    
    res.status(200).json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
