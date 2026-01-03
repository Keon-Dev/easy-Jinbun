const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const passport = require('passport');
// const csrf = require('csurf');
const Course = require('../models/Course');
const Review = require('../models/Review');
const { requireAdmin } = require('../middleware/auth');

// const csrfProtection = csrf({ cookie: true });

// ログインページ
// ===================================
router.get('/login', (req, res) => {
  if (req.isAuthenticated()) {
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', { 
    error: null,
  });
});

// ===================================
// ログイン処理（Passport）
// ===================================
router.post('/login', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      console.error('認証エラー:', err);
      return res.render('admin/login', {
        error: 'ログイン処理中にエラーが発生しました',
      });
    }
    
    if (!user) {
      return res.render('admin/login', {
        error: info.message || 'ユーザー名またはパスワードが間違っています',
      });
    }
    
    req.logIn(user, (err) => {
      if (err) {
        console.error('ログインエラー:', err);
        return res.render('admin/login', {
          error: 'ログイン処理中にエラーが発生しました',
        });
      }
      
      console.log('ログイン成功:', user.username);
      
      const returnTo = req.session.returnTo || '/admin/dashboard';
      delete req.session.returnTo;
      
      return res.redirect(returnTo);
    });
  })(req, res, next);
});

// ===================================
// ログアウト
// ===================================
router.post('/logout', (req, res) => {
  const username = req.user ? req.user.username : 'unknown';
  
  req.logout((err) => {
    if (err) {
      console.error('Logout error:', err);
      return res.redirect('/');
    }
    
    console.log('ログアウト成功:', username);
    
    req.session.destroy((err) => {
      if (err) {
        console.error('セッション破棄エラー:', err);
      }
      res.clearCookie('sessionId');
      res.redirect('/');
    });
  });
});

// ===================================
// 管理者ダッシュボード（認証必須）
// ===================================
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    // console.log('ダッシュボードアクセス:', req.session.username, 'セッションID:', req.sessionID);
    const courseCount = await Course.countDocuments();
    const reviewCount = await Review.countDocuments();
    const recentReviews = await Review.find()
      .sort({ created_at: -1 })
      .limit(100)
      .populate('course_id');
    
    res.render('admin/dashboard', {
      courseCount,
      reviewCount,
      recentReviews
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: 'ダッシュボードの読み込みに失敗しました',
      errors:[]
    });
  }
});

// ===================================
// レビュー削除（管理者のみ）
// ===================================
router.delete('/reviews/:id', requireAdmin, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'レビューが見つかりません'
      });
    }
    
    const courseId = review.course_id;
    // レビューを削除
    await Review.findByIdAndDelete(req.params.id);

    // 統計を再計算
    const reviews = await Review.find({ course_id: courseId });
    
    if (reviews.length > 0) {
      const avgEase = reviews.reduce((sum, r) => sum + r.ease_rating, 0) / reviews.length;
      const avgFun = reviews.reduce((sum, r) => sum + r.fun_rating, 0) / reviews.length;
      
      await Course.findByIdAndUpdate(courseId, {
        'stats.avg_ease': avgEase,
        'stats.avg_fun': avgFun,
        'stats.review_count': reviews.length
      });
    } else {
      await Course.findByIdAndUpdate(courseId, {
        'stats.avg_ease': 0,
        'stats.avg_fun': 0,
        'stats.review_count': 0
      });
    }
    
    console.log('レビュー削除成功:', req.params.id, 'by', req.session.username);
    
    res.json({ 
      success: true,
      message: 'レビューを削除しました'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: 'レビューの削除に失敗しました'
    });
  }
});

// ===================================
// 授業削除（管理者のみ）
// ===================================
router.delete('/courses/:id', requireAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        error: '授業が見つかりません'
      });
    }
    
    // 関連レビューも削除
    await Review.deleteMany({ course_id: req.params.id });
    // 授業を削除
    await Course.findByIdAndDelete(req.params.id);
    
    console.log('授業削除成功:', req.params.id, 'by', req.session.username);
    
    res.json({ 
      success: true,
      message: '授業を削除しました'
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: '授業の削除に失敗しました'
    });
  }
});

module.exports = router;