const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  professor: { type: String, required: true },
  target_grade: { 
  type: [String],  // 配列に変更
  required: true,
  validate: {
    validator: function(arr) {
      return arr && arr.length > 0;  // 最低1つは選択必須
    },
    message: '対象学年を1つ以上選択してください'
    }
  },

  class_format: { 
  type: String, 
  required: true,
  enum: ['通常', '集中講義'],
  default: '通常'
  }, // 授業形式

  // semester: { type: String, required: false }, // 開講時期
  credits: { type: Number, default: 1 },  
  // classroom: { type: String, default: '' }, // 講義室
  category: { type: String, default: '' ,required:true}, // 科目区分
  credit_type: { type: String, default: '選必' }, // 単位区分
  
  // オンデマンド割合
  attendance_count: { type: Number, default: 0 }, // 対面回数
  ondemand_count: { type: Number, default: 0 }, // オンデマンド回数
  ondemand_ratio: { type: Number, default: 0 }, // オンデマンド割合(%)
  
  // 成績評価割合
  grading: {
    report: { type: Number, default: 0 ,required:true}, // レポート
    exam: { type: Number, default: 0 ,required:true}, // 試験
    outside_task: { type: Number, default: 0 ,required:true}, // 授業外課題
    inside_task: { type: Number, default: 0 ,required:true}, // 授業中課題
    project: { type: Number, default: 0 ,required:true} // プロジェクト・発表
  },
  
  professor_email: { type: String, default: '' }, // 教員メアド
  campus: { type: String, default: '' }, // キャンパス区分
  description: { type: String, default: '' }, // 授業説明
  
  stats: {
    avg_ease: { type: Number, default: 0 },
    avg_fun: { type: Number, default: 0 },
    review_count: { type: Number, default: 0 }
  },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now } // 最終更新日を追加
},{
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } // Mongooseの自動タイムスタンプ機能
});
// ミドルウェア: バリデーション前に成績評価割合の合計をチェック
courseSchema.pre('validate', function(next) {
  const grading = this.grading;
  
  if (!grading) {
    return next();
  }

  // デフォルト値0を考慮して計算
  const total = 
    (grading.report || 0) + 
    (grading.exam || 0) + 
    (grading.outside_task || 0) + 
    (grading.inside_task || 0) + 
    (grading.project || 0);

  if (total !== 100) {
    const error = new Error('成績評価割合の合計は100%でなければなりません。');
    error.name = 'ValidationError';
    return next(error);
    // または this.invalidate('grading', '...') も可
  }
  
  next();
});

// ミドルウェア: findOneAndDelete実行後に関連レビューを削除
courseSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    const Review = mongoose.model('Review');
    const result = await Review.deleteMany({ course_id: doc._id });
    console.log(`✓ 授業「${doc.title}」を削除しました（関連レビュー: ${result.deletedCount}件）`);
  }
});

// ミドルウェア: deleteOne実行後に関連レビューを削除
courseSchema.post('deleteOne', { document: true, query: false }, async function(doc) {
  if (doc) {
    const Review = mongoose.model('Review');
    const result = await Review.deleteMany({ course_id: doc._id });
    console.log(`✓ 授業「${doc.title}」を削除しました（関連レビュー: ${result.deletedCount}件）`);
  }
});

// ミドルウェア: deleteMany実行前に関連レビューを削除
courseSchema.pre('deleteMany', async function() {
  const Review = mongoose.model('Review');
  // 削除対象の授業IDを取得
  const courses = await this.model.find(this.getQuery());
  const courseIds = courses.map(course => course._id);
  
  if (courseIds.length > 0) {
    const result = await Review.deleteMany({ course_id: { $in: courseIds } });
    console.log(`✓ ${courses.length}件の授業を削除します（関連レビュー: ${result.deletedCount}件）`);
  }
});

module.exports = mongoose.model('Course', courseSchema);