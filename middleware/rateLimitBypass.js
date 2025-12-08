/**
 * 管理者のレート制限を除外するミドルウェア
 */

function bypassRateLimitForAdmin(req, res, next) {
  // 管理者としてログインしている場合
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    // レート制限をスキップ
    console.log('レート制限除外:', req.user.username);
    return next('route'); // 次のルートハンドラにスキップ
  }
  
  // 管理者でない場合は通常のレート制限を適用
  next();
}

module.exports = bypassRateLimitForAdmin;