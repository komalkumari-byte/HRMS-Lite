import Employee from '../models/Employee.js';
import Department from '../models/Department.js';
import Attendance from '../models/Attendance.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: 'active' });
    const totalDepartments = await Department.countDocuments();
    
    // Today's attendance stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAttendance = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow }
    });
    const todayPresent = await Attendance.countDocuments({
      date: { $gte: today, $lt: tomorrow },
      status: 'present'
    });
    
    // Employees by department
    const employeesByDept = await Department.aggregate([
      {
        $lookup: {
          from: 'employees',
          localField: '_id',
          foreignField: 'department_id',
          as: 'employees'
        }
      },
      {
        $project: {
          name: 1,
          count: { $size: '$employees' }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 5
      }
    ]);

    // Recent hires
    const recentHires = await Employee.find()
      .populate('department_id', 'name')
      .sort({ hire_date: -1 })
      .limit(5)
      .lean();

    // Format recent hires
    const formattedRecentHires = recentHires.map(emp => ({
      ...emp,
      id: emp._id,
      department_name: emp.department_id?.name || null,
      department_id: emp.department_id?._id || null
    }));

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        totalDepartments,
        todayAttendance,
        todayPresent,
        employeesByDepartment: employeesByDept,
        recentHires: formattedRecentHires
      }
    });
  } catch (error) {
    next(error);
  }
};
