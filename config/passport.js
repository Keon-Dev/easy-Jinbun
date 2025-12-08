const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Admin = require('../models/Admin');

// ローカル認証戦略の設定
passport.use(new LocalStrategy(
  {
    usernameField: 'username',
    passwordField: 'password'
  },
  async (username, password, done) => {
    try {
      // 管理者をデータベースから検索
      const admin = await Admin.findOne({ username: username });
      
      if (!admin) {
        console.log('認証失敗: ユーザーが見つかりません -', username);
        return done(null, false, { message: 'ユーザー名またはパスワードが間違っています' });
      }
      
      // パスワードを検証
      const isMatch = await admin.comparePassword(password);
      
      if (!isMatch) {
        console.log('認証失敗: パスワードが一致しません -', username);
        return done(null, false, { message: 'ユーザー名またはパスワードが間違っています' });
      }
      
      // 最終ログイン日時を更新
      await admin.updateLastLogin();
      
      console.log('認証成功:', username);
      return done(null, admin);
    } catch (err) {
      console.error('認証エラー:', err);
      return done(err);
    }
  }
));

// セッションにユーザー情報をシリアライズ（保存）
passport.serializeUser((admin, done) => {
  console.log('serializeUser:', admin._id);
  done(null, admin._id);
});

// セッションからユーザー情報をデシリアライズ（復元）
passport.deserializeUser(async (id, done) => {
  try {
    const admin = await Admin.findById(id).select('-password'); // パスワードは除外
    console.log('deserializeUser:', admin ? admin.username : 'not found');
    done(null, admin);
  } catch (err) {
    console.error('deserializeUser error:', err);
    done(err);
  }
});

module.exports = passport;