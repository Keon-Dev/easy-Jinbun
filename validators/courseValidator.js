const Joi = require('joi');

// 授業作成・編集用のスキーマ
const courseSchema = Joi.object({
  title: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': '科目名は必須です',
      'string.max': '科目名は50文字以内で入力してください',
      'any.required': '科目名は必須です'
    }),
  
  professor: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': '担当教員は必須です',
      'string.max': '担当教員名は50文字以内で入力してください',
      'any.required': '担当教員は必須です'
    }),
  
  target_grade: Joi.alternatives()
    .try(
      Joi.array()
        .items(Joi.string().valid('1年', '2年', '3年', '4年'))
        .min(1)
        .required(),
      Joi.string().valid('1年', '2年', '3年', '4年')  // 単一選択も許容（後方互換性）
    )
    .required()
    .messages({
      'array.min': '対象学年を1つ以上選択してください',
      'any.only': '対象学年は1年、2年、3年、4年から選択してください',
      'any.required': '対象学年は必須です'
    }),
  
  semester: Joi.string()
    .min(1)
    .max(50)
    .required()
    .messages({
      'string.empty': '開講時期は必須です',
      'string.max': '開講時期は50文字以内で入力してください',
      'any.required': '開講時期は必須です'
    }),
  
  credits: Joi.number()
    .integer()
    .min(1)
    .max(10)
    .default(1)
    .messages({
      'number.base': '単位数は数値で入力してください',
      'number.min': '単位数は1以上で入力してください',
      'number.max': '単位数は10以下で入力してください'
    }),
  
  classroom: Joi.string()
    .max(50)
    .allow('')
    .optional()
    .messages({
      'string.max': '講義室は50文字以内で入力してください'
    }),
  
  category: Joi.string()
    .valid('人文社会系科目', 'グローバル教養科目', '')
    .allow('')
    .optional()
    .messages({
      'any.only': '科目区分は「人文社会系科目」または「グローバル教養科目」を選択してください'
    }),
  
  credit_type: Joi.string()
    .max(20)
    .default('選必')
    .messages({
      'string.max': '単位区分は20文字以内で入力してください'
    }),
  
  attendance_count: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .default(0)
    .messages({
      'number.base': '対面回数は数値で入力してください',
      'number.min': '対面回数は0以上で入力してください',
      'number.max': '対面回数は100以下で入力してください'
    }),
  
  ondemand_count: Joi.number()
    .integer()
    .min(0)
    .max(20)
    .default(0)
    .messages({
      'number.base': 'オンデマンド回数は数値で入力してください',
      'number.min': 'オンデマンド回数は0以上で入力してください',
      'number.max': 'オンデマンド回数は20以下で入力してください'
    }),
  
  report: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'レポート割合は数値で入力してください',
      'number.min': 'レポート割合は0以上で入力してください',
      'number.max': 'レポート割合は100以下で入力してください',
      'any.required': 'レポート割合は必須です（0%の場合も入力してください）'
    }),
  
  exam: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': '試験割合は数値で入力してください',
      'number.min': '試験割合は0以上で入力してください',
      'number.max': '試験割合は100以下で入力してください',
      'any.required': '試験割合は必須です（0%の場合も入力してください）'
    }),
  
  outside_task: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': '授業外課題割合は数値で入力してください',
      'number.min': '授業外課題割合は0以上で入力してください',
      'number.max': '授業外課題割合は100以下で入力してください',
      'any.required': '授業外課題割合は必須です（0%の場合も入力してください）'
    }),
  
  inside_task: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': '授業中課題割合は数値で入力してください',
      'number.min': '授業中課題割合は0以上で入力してください',
      'number.max': '授業中課題割合は100以下で入力してください',
      'any.required': '授業中課題割合は必須です（0%の場合も入力してください）'
    }),
  
  project: Joi.number()
    .integer()
    .min(0)
    .max(100)
    .required()
    .messages({
      'number.base': 'プロジェクト・発表割合は数値で入力してください',
      'number.min': 'プロジェクト・発表割合は0以上で入力してください',
      'number.max': 'プロジェクト・発表割合は100以下で入力してください',
      'any.required': 'プロジェクト・発表割合は必須です（0%の場合も入力してください）'
    }),
  
  professor_email: Joi.string()
    .email()
    .max(100)
    .allow('')
    .optional()
    .messages({
      'string.email': '有効なメールアドレスを入力してください',
      'string.max': 'メールアドレスは100文字以内で入力してください'
    }),
  
  campus: Joi.string()
    .max(50)
    .allow('')
    .optional()
    .messages({
      'string.max': 'キャンパス区分は50文字以内で入力してください'
    }),
  
  description: Joi.string()
    .max(2000)
    .allow('')
    .optional()
    .messages({
      'string.max': '授業説明は2000文字以内で入力してください'
    })
}).custom((value, helpers) => {
  // 成績評価割合の合計チェック
  const total = value.report + value.exam + value.outside_task + value.inside_task + value.project;
  
  if (total > 100) {
    return helpers.error('grading.total.exceeded', { total });
  }
  
  return value;
}).messages({
  'grading.total.exceeded': '成績評価割合の合計が100%を超えています（現在: {{#total}}%）'
});

module.exports = { courseSchema };