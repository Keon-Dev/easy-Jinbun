/**
 * 認証ミドルウェア（Passport統合版）
 */

// ログイン必須チェック
function requireAuth(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  console.log('認証失敗 - 未ログイン');
  
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({
      success: false,
      error: '認証が必要です',
      message: 'ログインしてください'
    });
  }
  
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

// 管理者チェック（Passport使用）
function requireAdmin(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  
  console.log('管理者権限なし - 未ログイン');
  
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(403).json({
      success: false,
      error: '権限がありません',
      message: '管理者のみアクセス可能です'
    });
  }
  
  req.session.returnTo = req.originalUrl;
  res.status(403).render('error', {
    title: '権限エラー',
    message: '管理者のみアクセス可能です。<a href="/admin/login">ログイン</a>してください。'
  });
}

// 管理者状態をテンプレートに渡す
function injectAdminStatus(req, res, next) {
  res.locals.isAdmin = req.isAuthenticated && req.isAuthenticated();
  res.locals.adminUsername = req.user ? req.user.username : null;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  injectAdminStatus
};