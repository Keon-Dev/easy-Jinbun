const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const csrf = require('csurf');
const Course = require('../models/Course');
const Review = require('../models/Review');
const { requireAdmin } = require('../middleware/auth');

const csrfProtection = csrf({ cookie: true });

// ===================================
// ログインページ
// ===================================
router.get('/login', csrfProtection, (req, res) => {
  // 既にログイン済みの場合はダッシュボードへ
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin/dashboard');
  }
  
  res.render('admin/login', { 
    error: null,
    csrfToken: req.csrfToken()
  });
});

// ===================================
// ログイン処理
// ===================================
router.post('/login', csrfProtection, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // 環境変数から管理者情報を取得
    const adminUsername = process.env.ADMIN_USERNAME;
    const adminPassword = process.env.ADMIN_PASSWORD;
    
    if (!adminPassword || !adminUsername) {
      return res.render('admin/login', {
        error: 'ユーザー名または、管理者パスワードが設定されていません',
        csrfToken: req.csrfToken()
      });
    }
    
    // ユーザー名チェック
    if (username !== adminUsername) {
      // console.log('ログイン失敗: ユーザー名が一致しません');
      return res.render('admin/login', {
        error: 'ユーザー名またはパスワードが間違っています',
        csrfToken: req.csrfToken()
      });
    }
    
    // パスワードチェック
    if (password !== adminPassword) {
      // console.log('ログイン失敗: パスワードが一致しません');
      return res.render('admin/login', {
        error: 'ユーザー名またはパスワードが間違っています',
        csrfToken: req.csrfToken()
      });
    }
    
    // セッションに保存（重要: regenerateで新しいセッションIDを生成）
    req.session.regenerate((err) => {
      if (err) {
        console.error('セッション再生成エラー:', err);
        return res.render('admin/login', {
          error: 'ログイン処理中にエラーが発生しました',
          csrfToken: req.csrfToken()
        });
      }
      
      // セッションに管理者情報を保存
      req.session.isAdmin = true;
      req.session.username = username;
      req.session.loginTime = new Date();
      
      // セッションを確実に保存
      req.session.save((err) => {
        if (err) {
          console.error('セッション保存エラー:', err);
          return res.render('admin/login', {
            error: 'ログイン処理中にエラーが発生しました',
            csrfToken: req.csrfToken()
          });
        }
        
        console.log('ログイン成功:', username, 'セッションID:', req.sessionID);
        
        // リダイレクト先を取得
        const returnTo = req.session.returnTo || '/admin/dashboard';
        delete req.session.returnTo;
        
        res.redirect(returnTo);
      });
    });
  } catch (err) {
    console.error('Login error:', err);
    res.render('admin/login', {
      error: 'ログイン処理中にエラーが発生しました',
      csrfToken: req.csrfToken()
    });
  }
});

// ===================================
// ログアウト
// ===================================
router.post('/logout', (req, res) => {
  const username = req.session.username;
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Logout error:', err);
    } else {
      console.log('ログアウト成功:', username);
    }
    
    // クッキーをクリア
    res.clearCookie('sessionId');
    res.redirect('/');
  });
});

// ===================================
// 管理者ダッシュボード（認証必須）
// ===================================
router.get('/dashboard', requireAdmin, async (req, res) => {
  try {
    console.log('ダッシュボードアクセス:', req.session.username, 'セッションID:', req.sessionID);
    
    const courseCount = await Course.countDocuments();
    const reviewCount = await Review.countDocuments();
    const recentReviews = await Review.find()
      .sort({ created_at: -1 })
      .limit(10)
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