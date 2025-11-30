const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDB接続
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/course-wiki', {
  // useNewUrlParser: true,
  // useUnifiedTopology: true
  // バージョン変更で不要になった。warningが出るためコメントアウト
})
.then(() => console.log('MongoDB接続成功'))
.catch(err => console.error('MongoDB接続エラー:', err));

// ミドルウェア
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ビューエンジン設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ルート
const coursesRouter = require('./routes/courses');
app.use('/', coursesRouter);

// 404エラーハンドリング(すべてのルートの後に配置)
app.use((req, res, next) => {
  res.status(404).render('error', {
    status: 404,
    message: 'ページが見つかりません',
    error: `リクエストされたURL「${req.url}」は存在しません。`
  });
});

// 500エラーハンドリング(その他のエラー)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).render('error', {
    status: err.status || 500,
    message: err.message || 'サーバーエラーが発生しました',
    error: process.env.NODE_ENV === 'development' ? err.stack : ''
  });
});

// サーバー起動
app.listen(PORT, () => {
  console.log(`サーバーがポート${PORT}で起動しました`);
});