import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Department from './models/Department.js';
import Employee from './models/Employee.js';

dotenv.config();

const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/hrms';

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing data (optional - comment out if you want to keep existing data)
    await Department.deleteMany({});
    await Employee.deleteMany({});
    console.log('Cleared existing data');

    // Create departments
    const departments = [
      { name: 'Human Resources', description: 'Manages employee relations, recruitment, and organizational development' },
      { name: 'Engineering', description: 'Software development, technical operations, and product engineering' },
      { name: 'Sales', description: 'Sales operations, customer relations, and business development' },
      { name: 'Marketing', description: 'Brand management, marketing campaigns, and digital marketing' },
      { name: 'Finance', description: 'Financial planning, accounting, and budget management' },
      { name: 'Operations', description: 'Business operations, logistics, and process optimization' }
    ];

    const createdDepartments = await Department.insertMany(departments);
    console.log(`Created ${createdDepartments.length} departments`);

    // Map department names to IDs
    const deptMap = {};
    createdDepartments.forEach(dept => {
      deptMap[dept.name] = dept._id;
    });

    // Create employees
    const employees = [
      {
        first_name: 'John',
        last_name: 'Smith',
        email: 'john.smith@hrms.com',
        phone: '+1-555-0101',
        position: 'Senior Software Engineer',
        department_id: deptMap['Engineering'],
        hire_date: new Date('2022-01-15'),
        salary: 95000.00,
        status: 'active'
      },
      {
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.johnson@hrms.com',
        phone: '+1-555-0102',
        position: 'HR Manager',
        department_id: deptMap['Human Resources'],
        hire_date: new Date('2021-03-20'),
        salary: 85000.00,
        status: 'active'
      },
      {
        first_name: 'Michael',
        last_name: 'Chen',
        email: 'michael.chen@hrms.com',
        phone: '+1-555-0103',
        position: 'Sales Director',
        department_id: deptMap['Sales'],
        hire_date: new Date('2020-06-10'),
        salary: 110000.00,
        status: 'active'
      },
      {
        first_name: 'Emily',
        last_name: 'Davis',
        email: 'emily.davis@hrms.com',
        phone: '+1-555-0104',
        position: 'Marketing Specialist',
        department_id: deptMap['Marketing'],
        hire_date: new Date('2023-02-01'),
        salary: 65000.00,
        status: 'active'
      },
      {
        first_name: 'David',
        last_name: 'Wilson',
        email: 'david.wilson@hrms.com',
        phone: '+1-555-0105',
        position: 'Financial Analyst',
        department_id: deptMap['Finance'],
        hire_date: new Date('2022-08-15'),
        salary: 72000.00,
        status: 'active'
      },
      {
        first_name: 'Lisa',
        last_name: 'Anderson',
        email: 'lisa.anderson@hrms.com',
        phone: '+1-555-0106',
        position: 'Frontend Developer',
        department_id: deptMap['Engineering'],
        hire_date: new Date('2023-05-10'),
        salary: 78000.00,
        status: 'active'
      },
      {
        first_name: 'Robert',
        last_name: 'Taylor',
        email: 'robert.taylor@hrms.com',
        phone: '+1-555-0107',
        position: 'Backend Developer',
        department_id: deptMap['Engineering'],
        hire_date: new Date('2022-11-20'),
        salary: 82000.00,
        status: 'active'
      },
      {
        first_name: 'Jessica',
        last_name: 'Martinez',
        email: 'jessica.martinez@hrms.com',
        phone: '+1-555-0108',
        position: 'Sales Representative',
        department_id: deptMap['Sales'],
        hire_date: new Date('2023-01-05'),
        salary: 55000.00,
        status: 'active'
      },
      {
        first_name: 'James',
        last_name: 'Brown',
        email: 'james.brown@hrms.com',
        phone: '+1-555-0109',
        position: 'Operations Manager',
        department_id: deptMap['Operations'],
        hire_date: new Date('2021-09-12'),
        salary: 90000.00,
        status: 'active'
      },
      {
        first_name: 'Amanda',
        last_name: 'Garcia',
        email: 'amanda.garcia@hrms.com',
        phone: '+1-555-0110',
        position: 'HR Coordinator',
        department_id: deptMap['Human Resources'],
        hire_date: new Date('2023-07-01'),
        salary: 58000.00,
        status: 'active'
      },
      {
        first_name: 'Christopher',
        last_name: 'Lee',
        email: 'christopher.lee@hrms.com',
        phone: '+1-555-0111',
        position: 'Marketing Manager',
        department_id: deptMap['Marketing'],
        hire_date: new Date('2022-04-18'),
        salary: 88000.00,
        status: 'active'
      },
      {
        first_name: 'Nicole',
        last_name: 'White',
        email: 'nicole.white@hrms.com',
        phone: '+1-555-0112',
        position: 'Accountant',
        department_id: deptMap['Finance'],
        hire_date: new Date('2023-03-22'),
        salary: 68000.00,
        status: 'active'
      },
      {
        first_name: 'Daniel',
        last_name: 'Harris',
        email: 'daniel.harris@hrms.com',
        phone: '+1-555-0113',
        position: 'DevOps Engineer',
        department_id: deptMap['Engineering'],
        hire_date: new Date('2022-07-08'),
        salary: 92000.00,
        status: 'active'
      },
      {
        first_name: 'Michelle',
        last_name: 'Clark',
        email: 'michelle.clark@hrms.com',
        phone: '+1-555-0114',
        position: 'Content Marketing Specialist',
        department_id: deptMap['Marketing'],
        hire_date: new Date('2023-06-15'),
        salary: 62000.00,
        status: 'active'
      },
      {
        first_name: 'Kevin',
        last_name: 'Lewis',
        email: 'kevin.lewis@hrms.com',
        phone: '+1-555-0115',
        position: 'Senior Sales Manager',
        department_id: deptMap['Sales'],
        hire_date: new Date('2021-12-01'),
        salary: 105000.00,
        status: 'active'
      }
    ];

    const createdEmployees = await Employee.insertMany(employees);
    console.log(`Created ${createdEmployees.length} employees`);

    console.log('✅ Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
