# MySQL Database Setup Guide

## Prerequisites

1. **Install MySQL Server**
   - Download and install MySQL Server from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
   - Or use package manager:
     - macOS: `brew install mysql`
     - Ubuntu/Debian: `sudo apt-get install mysql-server`
     - Windows: Use MySQL Installer

2. **Start MySQL Service**
   - macOS: `brew services start mysql`
   - Linux: `sudo systemctl start mysql`
   - Windows: MySQL should start automatically after installation

## Database Configuration

### 1. Create Database

Login to MySQL:
```bash
mysql -u root -p
```

Create the database:
```sql
CREATE DATABASE hrms;
EXIT;
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` directory:

```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=hrms
```

Replace `your_mysql_password` with your actual MySQL root password.

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Run the Application

The database tables and seed data will be created automatically when you start the server:

```bash
npm run dev
```

## Seed Data

The application automatically seeds the database with:

- **6 Departments**: Human Resources, Engineering, Sales, Marketing, Finance, Operations
- **15 Sample Employees** with complete details including:
  - Names, emails, phone numbers
  - Positions and departments
  - Hire dates and salaries
  - Status information

## Database Schema

### Tables

1. **users** - User accounts (for future use)
2. **departments** - Department information
3. **employees** - Employee records
4. **attendance** - Daily attendance tracking

### Sample Employees Included

- John Smith - Senior Software Engineer (Engineering)
- Sarah Johnson - HR Manager (Human Resources)
- Michael Chen - Sales Director (Sales)
- Emily Davis - Marketing Specialist (Marketing)
- David Wilson - Financial Analyst (Finance)
- Lisa Anderson - Frontend Developer (Engineering)
- Robert Taylor - Backend Developer (Engineering)
- Jessica Martinez - Sales Representative (Sales)
- James Brown - Operations Manager (Operations)
- Amanda Garcia - HR Coordinator (Human Resources)
- Christopher Lee - Marketing Manager (Marketing)
- Nicole White - Accountant (Finance)
- Daniel Harris - DevOps Engineer (Engineering)
- Michelle Clark - Content Marketing Specialist (Marketing)
- Kevin Lewis - Senior Sales Manager (Sales)

## Troubleshooting

### Connection Error

If you get a connection error:
1. Verify MySQL is running: `mysql -u root -p`
2. Check your `.env` file has correct credentials
3. Ensure the database `hrms` exists

### Permission Denied

If you get permission errors:
```sql
GRANT ALL PRIVILEGES ON hrms.* TO 'root'@'localhost';
FLUSH PRIVILEGES;
```

### Reset Database

To reset the database and re-seed:
```sql
DROP DATABASE hrms;
CREATE DATABASE hrms;
```

Then restart the application.
