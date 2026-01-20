import Attendance from '../models/Attendance.js';
import Employee from '../models/Employee.js';
import { NotFoundError, ConflictError } from '../middleware/errorHandler.js';

export const getAllAttendance = async (req, res, next) => {
  try {
    const { date, employee_id, start_date, end_date } = req.query;
    
    let query = {};

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
      const dateObj = new Date(date);
      dateObj.setHours(0, 0, 0, 0);
      const nextDay = new Date(dateObj);
      nextDay.setDate(nextDay.getDate() + 1);
      query.date = { $gte: dateObj, $lt: nextDay };
    }

    if (employee_id) {
      // Validate MongoDB ObjectId
      if (!/^[0-9a-fA-F]{24}$/.test(employee_id)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid employee ID',
          details: [{ field: 'employee_id', message: 'Employee ID must be a valid MongoDB ObjectId' }]
        });
      }
      query.employee_id = employee_id;
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
      const startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendance = await Attendance.find(query)
      .populate({
        path: 'employee_id',
        select: 'first_name last_name email position',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .sort({ date: -1, 'employee_id.first_name': 1 })
      .lean();

    // Format response
    const formattedAttendance = attendance.map(att => ({
      ...att,
      id: att._id,
      employee_id: att.employee_id?._id || att.employee_id,
      first_name: att.employee_id?.first_name,
      last_name: att.employee_id?.last_name,
      email: att.employee_id?.email,
      position: att.employee_id?.position,
      department_name: att.employee_id?.department_id?.name || null
    }));

    res.status(200).json({
      success: true,
      data: formattedAttendance,
      count: formattedAttendance.length
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceById = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid attendance ID',
        details: [{ field: 'id', message: 'Attendance ID must be a valid MongoDB ObjectId' }]
      });
    }

    const attendance = await Attendance.findById(id)
      .populate({
        path: 'employee_id',
        select: 'first_name last_name email position',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .lean();

    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    // Format response
    const formattedAttendance = {
      ...attendance,
      id: attendance._id,
      employee_id: attendance.employee_id?._id || attendance.employee_id,
      first_name: attendance.employee_id?.first_name,
      last_name: attendance.employee_id?.last_name,
      email: attendance.employee_id?.email,
      position: attendance.employee_id?.position,
      department_name: attendance.employee_id?.department_id?.name || null
    };

    res.status(200).json({
      success: true,
      data: formattedAttendance
    });
  } catch (error) {
    next(error);
  }
};

export const createAttendance = async (req, res, next) => {
  try {
    const { employee_id, date, check_in, check_out, status, notes } = req.body;

    // Validate employee_id
    if (!/^[0-9a-fA-F]{24}$/.test(employee_id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'employee_id', message: 'Employee ID must be a valid MongoDB ObjectId' }]
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employee_id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Parse date
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Check if attendance already exists for this date
    const existing = await Attendance.findOne({
      employee_id: employee_id,
      date: dateObj
    });

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

    const attendance = new Attendance({
      employee_id: employee_id,
      date: dateObj,
      check_in: check_in || null,
      check_out: check_out || null,
      status: status || 'present',
      notes: notes ? notes.trim() : null
    });

    await attendance.save();

    const savedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'employee_id',
        select: 'first_name last_name email position',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .lean();

    // Format response
    const formattedAttendance = {
      ...savedAttendance,
      id: savedAttendance._id,
      employee_id: savedAttendance.employee_id?._id || savedAttendance.employee_id,
      first_name: savedAttendance.employee_id?.first_name,
      last_name: savedAttendance.employee_id?.last_name,
      email: savedAttendance.employee_id?.email,
      position: savedAttendance.employee_id?.position,
      department_name: savedAttendance.employee_id?.department_id?.name || null
    };

    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: formattedAttendance
    });
  } catch (error) {
    if (error.code === 11000) {
      return next(new ConflictError('Attendance record already exists for this date'));
    }
    next(error);
  }
};

export const updateAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid attendance ID',
        details: [{ field: 'id', message: 'Attendance ID must be a valid MongoDB ObjectId' }]
      });
    }

    const { check_in, check_out, status, notes } = req.body;

    // Check if attendance exists
    const existing = await Attendance.findById(id);
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

    // Update fields
    if (check_in !== undefined) existing.check_in = check_in || null;
    if (check_out !== undefined) existing.check_out = check_out || null;
    if (status) existing.status = status;
    if (notes !== undefined) existing.notes = notes ? notes.trim() : null;

    await existing.save();

    const updatedAttendance = await Attendance.findById(id)
      .populate({
        path: 'employee_id',
        select: 'first_name last_name email position',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .lean();

    // Format response
    const formattedAttendance = {
      ...updatedAttendance,
      id: updatedAttendance._id,
      employee_id: updatedAttendance.employee_id?._id || updatedAttendance.employee_id,
      first_name: updatedAttendance.employee_id?.first_name,
      last_name: updatedAttendance.employee_id?.last_name,
      email: updatedAttendance.employee_id?.email,
      position: updatedAttendance.employee_id?.position,
      department_name: updatedAttendance.employee_id?.department_id?.name || null
    };

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: formattedAttendance
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAttendance = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Validate MongoDB ObjectId
    if (!/^[0-9a-fA-F]{24}$/.test(id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid attendance ID',
        details: [{ field: 'id', message: 'Attendance ID must be a valid MongoDB ObjectId' }]
      });
    }

    const attendance = await Attendance.findById(id);
    if (!attendance) {
      throw new NotFoundError('Attendance record not found');
    }

    await Attendance.findByIdAndDelete(id);
    
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

    // Validate employee_id
    if (!/^[0-9a-fA-F]{24}$/.test(employee_id)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Invalid employee ID',
        details: [{ field: 'employee_id', message: 'Employee ID must be a valid MongoDB ObjectId' }]
      });
    }

    // Check if employee exists
    const employee = await Employee.findById(employee_id);
    if (!employee) {
      throw new NotFoundError('Employee not found');
    }

    // Get current time
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    // Parse date
    const dateObj = new Date(date);
    dateObj.setHours(0, 0, 0, 0);

    // Check if attendance record exists
    let attendance = await Attendance.findOne({
      employee_id: employee_id,
      date: dateObj
    });

    if (action === 'check_in') {
      if (attendance && attendance.check_in) {
        throw new ConflictError('Already checked in for this date');
      }

      if (attendance) {
        // Update existing record
        attendance.check_in = time;
        attendance.status = 'present';
        await attendance.save();
      } else {
        // Create new record
        attendance = new Attendance({
          employee_id: employee_id,
          date: dateObj,
          check_in: time,
          status: 'present'
        });
        await attendance.save();
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

      attendance.check_out = time;
      await attendance.save();
    }

    // Return updated attendance record
    const updatedAttendance = await Attendance.findById(attendance._id)
      .populate({
        path: 'employee_id',
        select: 'first_name last_name email position',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .lean();

    // Format response
    const formattedAttendance = {
      ...updatedAttendance,
      id: updatedAttendance._id,
      employee_id: updatedAttendance.employee_id?._id || updatedAttendance.employee_id,
      first_name: updatedAttendance.employee_id?.first_name,
      last_name: updatedAttendance.employee_id?.last_name,
      email: updatedAttendance.employee_id?.email,
      position: updatedAttendance.employee_id?.position,
      department_name: updatedAttendance.employee_id?.department_id?.name || null
    };

    res.status(200).json({
      success: true,
      message: `${action === 'check_in' ? 'Checked in' : 'Checked out'} successfully`,
      data: formattedAttendance
    });
  } catch (error) {
    next(error);
  }
};

export const getAttendanceStats = async (req, res, next) => {
  try {
    const { start_date, end_date } = req.query;
    
    let dateFilter = {};
    
    if (start_date && end_date) {
      // Validate date format
      if (!/^\d{4}-\d{2}-\d{2}$/.test(start_date) || !/^\d{4}-\d{2}-\d{2}$/.test(end_date)) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'Invalid date format',
          details: [{ field: 'start_date/end_date', message: 'Dates must be in YYYY-MM-DD format' }]
        });
      }
      const startDate = new Date(start_date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end_date);
      endDate.setHours(23, 59, 59, 999);
      dateFilter.date = { $gte: startDate, $lte: endDate };
    }

    // Total attendance records
    const totalRecords = await Attendance.countDocuments(dateFilter);

    // Present count
    const presentFilter = { ...dateFilter, status: 'present' };
    const presentCount = await Attendance.countDocuments(presentFilter);

    // Absent count
    const absentFilter = { ...dateFilter, status: 'absent' };
    const absentCount = await Attendance.countDocuments(absentFilter);

    // Late count (check-in after 9:00 AM)
    const lateFilter = { 
      ...dateFilter, 
      status: 'present',
      check_in: { $gt: '09:00:00' }
    };
    const lateCount = await Attendance.countDocuments(lateFilter);

    // Today's attendance
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAttendance = await Attendance.find({
      date: { $gte: today, $lt: tomorrow }
    })
      .populate({
        path: 'employee_id',
        select: 'first_name last_name email position',
        populate: {
          path: 'department_id',
          select: 'name'
        }
      })
      .sort({ 'employee_id.first_name': 1 })
      .lean();

    // Format today's attendance
    const formattedTodayAttendance = todayAttendance.map(att => ({
      ...att,
      id: att._id,
      employee_id: att.employee_id?._id || att.employee_id,
      first_name: att.employee_id?.first_name,
      last_name: att.employee_id?.last_name,
      email: att.employee_id?.email,
      position: att.employee_id?.position,
      department_name: att.employee_id?.department_id?.name || null
    }));

    res.status(200).json({
      success: true,
      data: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        todayAttendance: formattedTodayAttendance
      }
    });
  } catch (error) {
    next(error);
  }
};
