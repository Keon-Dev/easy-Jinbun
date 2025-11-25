const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  professor: { type: String, required: true },
  category: { type: String, required: true },
  department: { type: String, default: '' },
  semester: { type: String, default: '' },
  credits: { type: Number, default: 2 },
  grading: {
    attendance: { type: Number, default: 0 },
    report: { type: Number, default: 0 },
    exam: { type: Number, default: 0 },
    presentation: { type: Number, default: 0 },
    other: { type: Number, default: 0 }
  },
  stats: {
    avg_ease: { type: Number, default: 0 },
    avg_fun: { type: Number, default: 0 },
    review_count: { type: Number, default: 0 }
  },
  description: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Course', courseSchema);