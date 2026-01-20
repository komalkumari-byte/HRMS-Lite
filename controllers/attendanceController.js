import db from '../config/database.js';
import { NotFoundError, ConflictError, ValidationError } from '../middleware/errorHandler.js';

export const getAllAttendance = async (req, res, next) => {
  try {
    const { date, employee_id, start_date, end_date } = req.query;
    let query = `
      SELECT a.*, 
             e.first_name, 
             e.last_name, 
             e.email,
             e.position,
             d.name as department_name
      FROM attendance a
      INNER JOIN employees e ON a.employee_id = e.id
      LEFT JOIN departments d ON e.department_id = d.id
      WHERE 1=1
    `;
    const params = [];

    if (date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid date format',
          details: [{ field: 'date', message: 'Date must be in YYYY-MM-DD format' }]
        });
      }
      query += ` AND a.date = ?`;
      params.push(date);
    }

    if (employee_id) {
      const empId = parseInt(employee_id);
      if (isNaN(empId) || empId < 1) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid employee ID',
          details: [{ field: 'employee_id', message: 'Employee ID must be a positive integer' }]
        });
      }
      query += ` AND a.employee_id = ?`;
      params.push(empId);
    }

    if (start_date && end_date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid date format',
          details: [{ field: 'start_date/end_date', message: 'Dates must be in YYYY-MM-DD format' }]
        });
      }
      query += ` AND a.date BETWEEN ? AND ?`;
      params.push(start_date, end_date);
    }

    query += ` ORDER BY a.date DESC, e.first_name ASC`;

    const attendance = await db.all(query, params);
    
    res.status(200).json({
      success: true,
      data: attendance,
      count: attendance.length
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attendanceId = parseInt(id);
    
    if (isNaN(attendanceId) || attendanceId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid attendance ID',
        details: [{ field: 'id', message: 'Attendance ID must be a positive integer' }]
      });
    }

    const attendance = await db.get(
      `SELECT a.*, 
              e.first_name, 
              e.last_name, 
              e.email,
              e.position,
              d.name as department_name
       FROM attendance a
       INNER JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE a.id = ?`,
      [attendanceId]
    );

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const createAttendance = async (req, res, next) => {
  try {
    const { employee_id, date, check_in, check_out, status, notes } = req.body;

    // Check if employee exists
    const employee = await db.get('SELECT * FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Check if attendance already exists for this date (duplicate handling)
    const existing = await db.get(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (existing) {
      throw new ConflictError('Attendance record already exists for this date');
    }

    // Validate check-in and check-out times if both provided
    if (check_in && check_out) {
      const [inH, inM] = check_in.split(':').map(Number);
      const [outH, outM] = check_out.split(':').map(Number);
      const checkInTime = inH * 60 + inM;
      const checkOutTime = outH * 60 + outM;
      
      if (checkOutTime <= checkInTime) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid time range',
          details: [{ field: 'check_out', message: 'Check-out time must be after check-in time' }]
        });
      }
    }

    const result = await db.run(
      `INSERT INTO attendance (employee_id, date, check_in, check_out, status, notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        parseInt(employee_id),
        date,
        check_in || null,
        check_out || null,
        status || 'present',
        notes ? notes.trim() : null
      ]
    );

    const attendance = await db.get(
      `SELECT a.*, 
              e.first_name, 
              e.last_name, 
              e.email,
              e.position,
              d.name as department_name
       FROM attendance a
       INNER JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE a.id = ?`,
      [result.lastID]
    );

    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attendanceId = parseInt(id);
    
    if (isNaN(attendanceId) || attendanceId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid attendance ID',
        details: [{ field: 'id', message: 'Attendance ID must be a positive integer' }]
      });
    }

    const { check_in, check_out, status, notes } = req.body;

    // Check if attendance exists
    const existing = await db.get('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    if (!existing) {
      throw new NotFoundError('Attendance record not found');
    }

    // Validate check-in and check-out times if both provided
    if (check_in && check_out) {
      const [inH, inM] = check_in.split(':').map(Number);
      const [outH, outM] = check_out.split(':').map(Number);
      const checkInTime = inH * 60 + inM;
      const checkOutTime = outH * 60 + outM;
      
      if (checkOutTime <= checkInTime) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid time range',
          details: [{ field: 'check_out', message: 'Check-out time must be after check-in time' }]
        });
      }
    }

    await db.run(
      `UPDATE attendance 
       SET check_in = ?, check_out = ?, status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        check_in || null,
        check_out || null,
        status || existing.status,
        notes !== undefined ? (notes ? notes.trim() : null) : existing.notes,
        attendanceId
      ]
    );

    const attendance = await db.get(
      `SELECT a.*, 
              e.first_name, 
              e.last_name, 
              e.email,
              e.position,
              d.name as department_name
       FROM attendance a
       INNER JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE a.id = ?`,
      [attendanceId]
    );

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const attendanceId = parseInt(id);
    
    if (isNaN(attendanceId) || attendanceId < 1) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid attendance ID',
        details: [{ field: 'id', message: 'Attendance ID must be a positive integer' }]
      });
    }

    const attendance = await db.get('SELECT * FROM attendance WHERE id = ?', [attendanceId]);
    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    await db.run('DELETE FROM attendance WHERE id = ?', [attendanceId]);
    
    res.status(200).json({
      success: true,
      message: 'Attendance record deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

export const markAttendance = async (req, res, next) => {
  try {
    const { employee_id, date, action } = req.body;

    // Check if employee exists
    const employee = await db.get('SELECT * FROM employees WHERE id = ?', [employee_id]);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Get current time
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Check if attendance record exists
    let attendance = await db.get(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employee_id, date]
    );

    if (action === 'check_in') {
      if (attendance && attendance.check_in) {
        throw new ConflictError('Already checked in for this date');
      }

      if (attendance) {
        // Update existing record
        await db.run(
          'UPDATE attendance SET check_in = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
          [time, 'present', attendance.id]
        );
      } else {
        // Create new record
        await db.run(
          'INSERT INTO attendance (employee_id, date, check_in, status) VALUES (?, ?, ?, ?)',
          [employee_id, date, time, 'present']
        );
      }
    } else if (action === 'check_out') {
      if (!attendance) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Must check in before checking out',
          details: [{ field: 'action', message: 'Employee must check in first before checking out' }]
        });
      }

      if (attendance.check_out) {
        throw new ConflictError('Already checked out for this date');
      }

      await db.run(
        'UPDATE attendance SET check_out = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [time, attendance.id]
      );
    }

    // Return updated attendance record
    attendance = await db.get(
      `SELECT a.*, 
              e.first_name, 
              e.last_name, 
              e.email,
              e.position,
              d.name as department_name
       FROM attendance a
       INNER JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE a.employee_id = ? AND a.date = ?`,
      [employee_id, date]
    );

    res.status(200).json({
      success: true,
      message: `${action === 'check_in' ? 'Checked in' : 'Checked out'} successfully`,
      data: attendance
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Validate date format if provided
    if (start_date && !/^\d{4}-\d{2}-\d{2}$/.test(start_date)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid start date format',
        details: [{ field: 'start_date', message: 'Start date must be in YYYY-MM-DD format' }]
      });
    }
    
    if (end_date && !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid end date format',
        details: [{ field: 'end_date', message: 'End date must be in YYYY-MM-DD format' }]
      });
    }

    let dateFilter = '';
    const params = [];
    
    if (start_date && end_date) {
      dateFilter = 'WHERE a.date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    // Total attendance records
    const totalRecords = await db.get(
      `SELECT COUNT(*) as count FROM attendance ${dateFilter}`,
      params
    );

    // Present count
    const presentParams = [...params];
    const presentFilter = dateFilter 
      ? `${dateFilter} AND status = 'present'`
      : "WHERE status = 'present'";
    const presentCount = await db.get(
      `SELECT COUNT(*) as count FROM attendance ${presentFilter}`,
      presentParams
    );

    // Absent count
    const absentParams = [...params];
    const absentFilter = dateFilter 
      ? `${dateFilter} AND status = 'absent'`
      : "WHERE status = 'absent'";
    const absentCount = await db.get(
      `SELECT COUNT(*) as count FROM attendance ${absentFilter}`,
      absentParams
    );

    // Late count (check-in after 9:00 AM)
    const lateParams = [...params];
    const lateFilter = dateFilter 
      ? `${dateFilter} AND check_in > '09:00:00' AND status = 'present'`
      : "WHERE check_in > '09:00:00' AND status = 'present'";
    const lateCount = await db.get(
      `SELECT COUNT(*) as count FROM attendance ${lateFilter}`,
      lateParams
    );

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await db.all(
      `SELECT a.*, 
              e.first_name, 
              e.last_name, 
              e.email,
              e.position,
              d.name as department_name
       FROM attendance a
       INNER JOIN employees e ON a.employee_id = e.id
       LEFT JOIN departments d ON e.department_id = d.id
       WHERE a.date = ?
       ORDER BY e.first_name ASC`,
      [today]
    );

    res.status(200).json({
      success: true,
      data: {
        totalRecords: totalRecords.count,
        presentCount: presentCount.count,
        absentCount: absentCount.count,
        lateCount: lateCount.count,
        todayAttendance
      }
    });
  } catch (error) {
    next(error);
  }
};
