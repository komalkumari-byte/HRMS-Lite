import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  employee_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  check_in: {
    type: String // Storing as string (HH:MM format)
  },
  check_out: {
    type: String // Storing as string (HH:MM format)
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half_day'],
    default: 'present'
  },
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique employee-date combination
attendanceSchema.index({ employee_id: 1, date: 1 }, { unique: true });

export default mongoose.model('Attendance', attendanceSchema);
