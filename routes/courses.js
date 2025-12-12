const express = require('express');
const router = express.Router();
// const csrf = require('csurf'); 
const Course = require('../models/Course');
const Review = require('../models/Review');
const validateRequest = require('../middleware/validateRequest');
const { courseSchema } = require('../validators/courseValidator');
const { reviewSchema } = require('../validators/reviewValidator');

// CSRF保護ミドルウェア
// const csrfProtection = csrf({ cookie: true });

/**
 * 全角文字を半角に変換する関数
 */
function normalizeString(str) {
  if (!str) return str;
  
  return str
    .replace(/[０-９]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    })
    .replace(/[Ａ-Ｚａ-ｚ]/g, function(s) {
      return String.fromCharCode(s.charCodeAt(0) - 0xFEE0);
    })
    .replace(/　/g, ' ');
}

// ===================================
// GET ルート
// ===================================

// 一覧ページ
router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    let query = {};
    
    if (search) {
      const normalizedSearch = normalizeString(search);
      
      query.$or = [
        { title: new RegExp(normalizedSearch, 'i') },
        { professor: new RegExp(normalizedSearch, 'i') },
        { target_grade: new RegExp(normalizedSearch, 'i') },
        { class_format: new RegExp(normalizedSearch, 'i') },
        // { semester: new RegExp(normalizedSearch, 'i') },
        // { classroom: new RegExp(normalizedSearch, 'i') },
        { campus: new RegExp(normalizedSearch, 'i') },
        { category: new RegExp(normalizedSearch, 'i') },
        { description: new RegExp(normalizedSearch, 'i') }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    let sortOption = {};
    if (sort === 'ease_desc') sortOption = { 'stats.avg_ease': -1 };
    else if (sort === 'fun_desc') sortOption = { 'stats.avg_fun': -1 };
    else if (sort === 'reviews_desc') sortOption = { 'stats.review_count': -1 };
    else sortOption = { created_at: -1 };
    
    const courses = await Course.find(query).sort(sortOption);
    
    res.render('index', { courses, query: req.query || {} });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: '授業一覧の取得に失敗しました'
    });
  }
});

// 新規作成フォーム
router.get('/courses/new', (req, res) => {
  res.render('edit', { 
    course: null, 
    isEdit: false,
  });
});

// 詳細ページ
router.get('/courses/:id', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'エラー',
        message: '無効な授業IDです'
      });
    }
    
    const course = await Course.findById(req.params.id);
    const reviews = await Review.find({ course_id: req.params.id }).sort({ created_at: -1 });
    
    if (!course) {
      return res.status(404).render('error', {
        title: '授業が見つかりません',
        message: '指定された授業は存在しないか、削除された可能性があります'
      });
    }
    
    res.render('detail', { 
      course, 
      reviews,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: '授業詳細の取得に失敗しました'
    });
  }
});

// 編集フォーム（
router.get('/courses/:id/edit', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'エラー',
        message: '無効な授業IDです'
      });
    }
    
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).render('error', {
        title: '授業が見つかりません',
        message: '指定された授業は存在しないか、削除された可能性があります'
      });
    }
    
    res.render('edit', { 
      course, 
      isEdit: true,
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: '授業情報の取得に失敗しました'
    });
  }
});

// ===================================
// POST ルート（）
// ===================================

// 新規作成処理
router.post('/courses', validateRequest(courseSchema), async (req, res) => {
  try {
    const attendanceCount = Number(req.body.attendance_count) || 0;
    const ondemandCount = Number(req.body.ondemand_count) || 0;
    const total = attendanceCount + ondemandCount;
    const ondemandRatio = total === 0 ? 0 : (ondemandCount / total * 100);
    
    // target_grade を配列に変換（単一の場合も配列化）
    let targetGrades = req.body.target_grade;
    if (typeof targetGrades === 'string') {
      targetGrades = [targetGrades];
    } else if (!Array.isArray(targetGrades)) {
      targetGrades = [];
    }
    
    const courseData = {
      title: req.body.title,
      professor: req.body.professor,
      class_format: req.body.class_format,
      target_grade: targetGrades,
      // semester: req.body.semester,
      credits: req.body.credits || 1,
      // classroom: req.body.classroom,
      category: req.body.category,
      credit_type: req.body.credit_type,
      attendance_count: attendanceCount,
      ondemand_count: ondemandCount,
      ondemand_ratio: ondemandRatio,
      grading: {
        report: Number(req.body.report) || 0,
        exam: Number(req.body.exam) || 0,
        outside_task: Number(req.body.outside_task) || 0,
        inside_task: Number(req.body.inside_task) || 0,
        project: Number(req.body.project) || 0
      },
      professor_email: req.body.professor_email,
      campus: req.body.campus,
      description: req.body.description
    };
    
    const course = new Course(courseData);
    await course.save();
    
    res.redirect(`/courses/${course._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: '授業の登録に失敗しました'
    });
  }
});

// 編集処理
router.post('/courses/:id',  validateRequest(courseSchema), async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'エラー',
        message: '無効な授業IDです'
      });
    }
    
    const attendanceCount = Number(req.body.attendance_count) || 0;
    const ondemandCount = Number(req.body.ondemand_count) || 0;
    const total = attendanceCount + ondemandCount;
    const ondemandRatio = total === 0 ? 0 : (ondemandCount / total * 100);
    
    const updateData = {
      title: req.body.title,
      professor: req.body.professor,
      target_grade: req.body.target_grade,
      // semester: req.body.semester,
      credits: req.body.credits || 1,
      // classroom: req.body.classroom,
      class_format: req.body.class_format,
      
      category: req.body.category,
      credit_type: req.body.credit_type,
      attendance_count: attendanceCount,
      ondemand_count: ondemandCount,
      ondemand_ratio: ondemandRatio,
      grading: {
        report: Number(req.body.report) || 0,
        exam: Number(req.body.exam) || 0,
        outside_task: Number(req.body.outside_task) || 0,
        inside_task: Number(req.body.inside_task) || 0,
        project: Number(req.body.project) || 0
      },
      professor_email: req.body.professor_email,
      campus: req.body.campus,
      description: req.body.description
    };
    
    const course = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!course) {
      return res.status(404).render('error', {
        title: '授業が見つかりません',
        message: '指定された授業は存在しないか、削除された可能性があります'
      });
    }
    
    res.redirect(`/courses/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: '授業の更新に失敗しました'
    });
  }
});

// レビュー投稿処理
router.post('/courses/:id/reviews', async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).render('error', {
        title: 'エラー',
        message: '無効な授業IDです'
      });
    }
    
    const reviewData = {
      course_id: req.params.id,
      user_uuid: req.body.user_uuid,
      ease_rating: req.body.ease_rating,
      fun_rating: req.body.fun_rating,
      comment: req.body.comment
    };
    
    const { error, value } = reviewSchema.validate(reviewData, {
      abortEarly: false,
      stripUnknown: true
    });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      return res.status(400).render('error', {
        title: '入力エラー',
        errors: errors
      });
    }
    
    const review = new Review({
      course_id: value.course_id,
      user_uuid: value.user_uuid,
      ease_rating: Number(value.ease_rating),
      fun_rating: Number(value.fun_rating),
      comment: value.comment
    });
    
    await review.save();
    
    const reviews = await Review.find({ course_id: req.params.id });
    const avgEase = reviews.reduce((sum, r) => sum + r.ease_rating, 0) / reviews.length;
    const avgFun = reviews.reduce((sum, r) => sum + r.fun_rating, 0) / reviews.length;
    
    await Course.findByIdAndUpdate(req.params.id, {
      'stats.avg_ease': avgEase,
      'stats.avg_fun': avgFun,
      'stats.review_count': reviews.length
    });
    
    res.redirect(`/courses/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: 'レビューの投稿に失敗しました'
    });
  }
});

module.exports = router;