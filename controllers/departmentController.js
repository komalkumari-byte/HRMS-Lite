import { validationResult } from 'express-validator';
import Department from '../models/Department.js';
import Employee from '../models/Employee.js';

export const getAllDepartments = async (req, res) => {
  try {
    const departments = await Department.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'department_id',
          as: 'employees'
        }
      },
      {
        $addFields: {
          employee_count: { $size: '$employees' }
        }
      },
      {
        $project: {
          employees: 0
        }
      },
      {
        $sort: { name: 1 }
      }
    ]);
    res.json(departments);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ error: 'Server error fetching departments' });
  }
};

export const getDepartmentById = async (req, res) => {
  try {
    const { id } = req.params;
    const department = await Department.findById(id);

    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Get employees in this department
    const employees = await Employee.find({ department_id: id })
      .select('first_name last_name email position')
      .lean();

    const departmentObj = department.toObject();
    departmentObj.employees = employees;

    res.json(departmentObj);
  } catch (error) {
    console.error('Get department error:', error);
    res.status(500).json({ error: 'Server error fetching department' });
  }
};

export const createDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, description } = req.body;

    // Check if department exists
    const existing = await Department.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ error: 'Department with this name already exists' });
    }

    const department = new Department({
      name: name.trim(),
      description: description?.trim() || null
    });

    await department.save();
    res.status(201).json(department);
  } catch (error) {
    console.error('Create department error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Department with this name already exists' });
    }
    res.status(500).json({ error: 'Server error creating department' });
  }
};

export const updateDepartment = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { name, description } = req.body;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if name is taken by another department
    if (name !== department.name) {
      const nameExists = await Department.findOne({ name: name.trim(), _id: { $ne: id } });
      if (nameExists) {
        return res.status(400).json({ error: 'Department name already taken' });
      }
    }

    department.name = name.trim();
    department.description = description?.trim() || null;
    await department.save();

    res.json(department);
  } catch (error) {
    console.error('Update department error:', error);
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Department name already taken' });
    }
    res.status(500).json({ error: 'Server error updating department' });
  }
};

export const deleteDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id);
    if (!department) {
      return res.status(404).json({ error: 'Department not found' });
    }

    // Check if department has employees
    const employeeCount = await Employee.countDocuments({ department_id: id });

    if (employeeCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete department with assigned employees. Please reassign employees first.' 
      });
    }

    await Department.findByIdAndDelete(id);
    res.json({ message: 'Department deleted successfully' });
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ error: 'Server error deleting department' });
  }
};