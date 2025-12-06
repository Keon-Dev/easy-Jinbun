const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const csrf = require('csurf');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const morgan = require('morgan');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ===================================
// ログ設定
// ===================================
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

// ===================================
// MongoDB接続
// ===================================
mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/course-wiki', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => logger.info('MongoDB接続成功'))
.catch(err => {
  logger.error('MongoDB接続エラー:', err);
  process.exit(1);
});

// ===================================
// セキュリティミドルウェア
// ===================================

// Helmet: セキュリティヘッダーの設定
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"]
    }
  }
}));

// レート制限
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分
  max: 200, // 最大200リクエスト
  message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);

// ログインエンドポイント用の厳しいレート制限
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5, // 10分で5回まで
  message: 'ログイン試行回数が多すぎます。15分後に再試行してください。'
});

// NoSQL Injection対策
app.use(mongoSanitize());

// HTTPログ
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// ===================================
// 基本ミドルウェア
// ===================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 1. Cookie Parser（セッションより前に必要）
app.use(cookieParser());

// 2. セッション設定（CSRFより前に必要）
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/course-wiki',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60 // 1日
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // 本番環境ではHTTPSのみ
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 1日
    sameSite: 'lax' // CSRF対策
  },
  name: 'sessionId' // デフォルトの connect.sid から変更
}));

// CSRF対策（セッションの後に必要）
const csrfProtection = csrf({ cookie: true });

// ビューエンジン設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 管理者状態をテンプレートに注入
const { injectAdminStatus } = require('./middleware/auth');
app.use(injectAdminStatus);

// CSRFトークンをすべてのビューに渡す
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  next();
});

// ===================================
// ルート
// ===================================
const coursesRouter = require('./routes/courses');
const adminRouter = require('./routes/admin');

// GET リクエストにはCSRF不要
app.use('/', coursesRouter);

// 管理者ルート（ログインページはCSRF不要）
app.use('/admin', adminRouter);

// POSTリクエストにCSRF保護を適用（ログイン以外）
app.use('/courses', csrfProtection);

// ===================================
// エラーハンドリング
// ===================================
app.use((err, req, res, next) => {
  if (err.code === 'EBADCSRFTOKEN') {
    logger.warn('CSRF token validation failed:', req.ip);
    res.status(403).render('error', {
      title: 'セキュリティエラー',
      message: '不正なリクエストです。ページを再読み込みしてください。'
    });
  } else {
    logger.error('Server error:', err);
    res.status(500).render('error', {
      title: 'サーバーエラー',
      message: process.env.NODE_ENV === 'production' 
        ? 'サーバーエラーが発生しました' 
        : err.message
    });
  }
});

// ===================================
// サーバー起動
// ===================================
app.listen(PORT, () => {
  logger.info(`サーバーがポート${PORT}で起動しました`);
  logger.info(`環境: ${process.env.NODE_ENV || 'development'}`);
});

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});