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
const passport = require('passport');
require('dotenv').config();

const app = express();
app.set('trust proxy', 1);//プロキシ環境で正しく動作させるための設定
const PORT = process.env.PORT || 3000;

// ===================================
// ログ設定
// ===================================
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
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

// NoSQL Injection対策
app.use(mongoSanitize());

// HTTPログ
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));


// ===================================
// 基本ミドルウェア（順序が重要！）
// ===================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
// 静的ファイルの提供（Vercel対応）


// 1. Cookie Parser（セッションより前）
app.use(cookieParser());

// 2. セッション設定（Passportより前）
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/course-wiki',
    collectionName: 'sessions',
    ttl: 24 * 60 * 60
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  },
  name: 'sessionId'
}));

// 3. Passport設定をインポート（セッションの後）
require('./config/passport'); // Passport戦略を設定

// 4. Passport初期化（必ずこの順序）
app.use(passport.initialize());
app.use(passport.session());

// 5. 管理者状態をテンプレートに注入（Passportの後）
const { injectAdminStatus } = require('./middleware/auth');
app.use(injectAdminStatus);

// 6.CSRF対策（セッションの後に必要）
const csrfProtection = csrf({ cookie: true });
// [修正] CSRFミドルウェアを適用し、req.csrfToken()を使用可能にする
app.use(csrfProtection);
// CSRFトークンをすべてのビューに渡す
app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken ? req.csrfToken() : null;
  next();
});

// 7. レート制限（Passportの後、管理者判定ができる）
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10分
  max: 200, // 最大200リクエスト
  message: 'リクエストが多すぎます。しばらく待ってから再試行してください。',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req, res) => {
    // 管理者の場合はレート制限をスキップ
    return req.isAuthenticated && req.isAuthenticated();
  }
});

app.use(limiter);

// 8. ログイン専用の厳しいレート制限
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5, // 10分で5回まで
  message: 'ログイン試行回数が多すぎます。再試行してください。',
  skipSuccessfulRequests: true // 成功したログインはカウントしない
});



// 9.ビューエンジン設定
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));



// ===================================
// 10.ルート
// ===================================
const coursesRouter = require('./routes/courses');
const adminRouter = require('./routes/admin');

// [修正] ログイン専用の厳しい制限を特定のパスに限定して、ルーターよりも先に適用
app.use('/admin/login', loginLimiter)
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
// サーバー起動（Vercel対応）
// ===================================

// Vercel環境ではサーバーを起動しない
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    logger.info(`サーバーがポート${PORT}で起動しました`);
    logger.info(`環境: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Vercel用のエクスポート
module.exports = app;

// プロセス終了時のクリーンアップ
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  mongoose.connection.close(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
});
// // ===================================
// // サーバー起動
// // ===================================
// app.listen(PORT, () => {
//   logger.info(`サーバーがポート${PORT}で起動しました`);
//   logger.info(`環境: ${process.env.NODE_ENV || 'development'}`);
// });

// // プロセス終了時のクリーンアップ
// process.on('SIGTERM', () => {
//   logger.info('SIGTERM signal received: closing HTTP server');
//   mongoose.connection.close(() => {
//     logger.info('MongoDB connection closed');
//     process.exit(0);
//   });
// });
module.exports = app;