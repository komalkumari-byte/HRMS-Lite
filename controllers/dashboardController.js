import db from '../config/database.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const totalEmployees = await db.get('SELECT COUNT(*) as count FROM employees');
    const activeEmployees = await db.get("SELECT COUNT(*) as count FROM employees WHERE status = 'active'");
    const totalDepartments = await db.get('SELECT COUNT(*) as count FROM departments');
    
    // Today's attendance stats
    const today = new Date().toISOString().split('T')[0];
    const todayAttendance = await db.get(
      `SELECT COUNT(*) as count FROM attendance WHERE date = ?`,
      [today]
    );
    const todayPresent = await db.get(
      `SELECT COUNT(*) as count FROM attendance WHERE date = ? AND status = 'present'`,
      [today]
    );
    
    const employeesByDept = await db.all(`
      SELECT d.name, COUNT(e.id) as count 
      FROM departments d 
      LEFT JOIN employees e ON d.id = e.department_id 
      GROUP BY d.id, d.name 
      ORDER BY count DESC 
      LIMIT 5
    `);

    const recentHires = await db.all(`
      SELECT e.*, d.name as department_name 
      FROM employees e 
      LEFT JOIN departments d ON e.department_id = d.id 
      ORDER BY e.hire_date DESC 
      LIMIT 5
    `);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: totalEmployees.count,
        activeEmployees: activeEmployees.count,
        totalDepartments: totalDepartments.count,
        todayAttendance: todayAttendance.count,
        todayPresent: todayPresent.count,
        employeesByDepartment: employeesByDept,
        recentHires
      }
    });
  } catch (error) {
    next(error);
  }
};