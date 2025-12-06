/**
 * 認証ミドルウェア
 */

// ログイン必須チェック（より厳密に）
function requireAuth(req, res, next) {
  // セッションが存在し、管理者フラグが立っているか確認
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  
  // ログに記録
  console.log('認証失敗 - セッション:', req.session);
  
  // JSONリクエストの場合
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(401).json({
      success: false,
      error: '認証が必要です',
      message: 'ログインしてください'
    });
  }
  
  // HTMLリクエストの場合
  req.session.returnTo = req.originalUrl;
  res.redirect('/admin/login');
}

// 管理者チェック
function requireAdmin(req, res, next) {
  // セッションが存在し、管理者フラグが立っているか確認
  if (req.session && req.session.isAdmin === true) {
    return next();
  }
  
  // ログに記録
  console.log('管理者権限なし - セッション:', req.session);
  
  // JSONリクエストの場合
  if (req.headers.accept && req.headers.accept.includes('application/json')) {
    return res.status(403).json({
      success: false,
      error: '権限がありません',
      message: '管理者のみアクセス可能です'
    });
  }
  
  // HTMLリクエストの場合
  req.session.returnTo = req.originalUrl;
  res.status(403).render('error', {
    title: '権限エラー',
    message: '管理者のみアクセス可能です。ログインしてください。'
  });
}

// 管理者状態をテンプレートに渡す
function injectAdminStatus(req, res, next) {
  res.locals.isAdmin = req.session && req.session.isAdmin === true;
  res.locals.adminUsername = req.session && req.session.username || null;
  next();
}

module.exports = {
  requireAuth,
  requireAdmin,
  injectAdminStatus
};