const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  course_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  user_uuid: { type: String, required: true },
  ease_rating: { type: Number, required: true, min: 1, max: 5 },
  fun_rating: { type: Number, required: true, min: 1, max: 5 },
  comment: { type: String, default: '' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Review', reviewSchema);