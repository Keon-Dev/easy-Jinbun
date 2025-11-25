const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const Review = require('../models/Review');

// 一覧ページ
router.get('/', async (req, res) => {
  try {
    const { search, category, sort } = req.query;
    let query = {};
    
    // 検索フィルタ
    if (search) {
      query.$or = [
        { title: new RegExp(search, 'i') },
        { professor: new RegExp(search, 'i') }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    // ソート
    let sortOption = {};
    if (sort === 'ease_desc') sortOption = { 'stats.avg_ease': -1 };
    else if (sort === 'fun_desc') sortOption = { 'stats.avg_fun': -1 };
    else if (sort === 'reviews_desc') sortOption = { 'stats.review_count': -1 };
    else sortOption = { created_at: -1 };
    
    const courses = await Course.find(query).sort(sortOption);
    
    // queryオブジェクトを確実に渡す
    res.render('index', { 
      courses, 
      query: req.query || {} // 空オブジェクトをデフォルトに
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー');
  }
});

// 新規作成フォーム
router.get('/courses/new', (req, res) => {
  res.render('edit', { course: null, isEdit: false });
});

// 詳細ページ
router.get('/courses/:id', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    const reviews = await Review.find({ course_id: req.params.id }).sort({ created_at: -1 });
    
    if (!course) {
      return res.status(404).send('授業が見つかりません');
    }
    
    res.render('detail', { course, reviews });
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー');
  }
});

// 編集フォーム
router.get('/courses/:id/edit', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).send('授業が見つかりません');
    }
    
    res.render('edit', { course, isEdit: true });
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー');
  }
});

// 新規作成処理
router.post('/courses', async (req, res) => {
  try {
    const courseData = {
      title: req.body.title,
      professor: req.body.professor,
      category: req.body.category,
      department: req.body.department,
      semester: req.body.semester,
      credits: req.body.credits,
      grading: {
        attendance: Number(req.body.attendance) || 0,
        report: Number(req.body.report) || 0,
        exam: Number(req.body.exam) || 0,
        presentation: Number(req.body.presentation) || 0,
        other: Number(req.body.other) || 0
      },
      description: req.body.description
    };
    
    const course = new Course(courseData);
    await course.save();
    
    res.redirect(`/courses/${course._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー');
  }
});

// 編集処理
router.post('/courses/:id', async (req, res) => {
  try {
    const updateData = {
      title: req.body.title,
      professor: req.body.professor,
      category: req.body.category,
      department: req.body.department,
      semester: req.body.semester,
      credits: req.body.credits,
      grading: {
        attendance: Number(req.body.attendance) || 0,
        report: Number(req.body.report) || 0,
        exam: Number(req.body.exam) || 0,
        presentation: Number(req.body.presentation) || 0,
        other: Number(req.body.other) || 0
      },
      description: req.body.description
    };
    
    await Course.findByIdAndUpdate(req.params.id, updateData);
    
    res.redirect(`/courses/${req.params.id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send('サーバーエラー');
  }
});

// レビュー投稿処理
router.post('/courses/:id/reviews', async (req, res) => {
  try {
    const reviewData = {
      course_id: req.params.id,
      user_uuid: req.body.user_uuid,
      ease_rating: Number(req.body.ease_rating),
      fun_rating: Number(req.body.fun_rating),
      comment: req.body.comment
    };
    
    const review = new Review(reviewData);
    await review.save();
    
    // 統計を再計算
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
    res.status(500).send('サーバーエラー');
  }
});

module.exports = router;