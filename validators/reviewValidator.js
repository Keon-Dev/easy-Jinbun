const Joi = require('joi');

// レビュー投稿用のスキーマ
const reviewSchema = Joi.object({
  course_id: Joi.string()
    .pattern(/^[0-9a-fA-F]{24}$/)
    .required()
    .messages({
      'string.pattern.base': '無効な授業IDです',
      'any.required': '授業IDは必須です'
    }),
  
  user_uuid: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.guid': '無効なユーザーIDです',
      'any.required': 'ユーザーIDは必須です'
    }),
  
  ease_rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': '楽単度は数値で入力してください',
      'number.min': '楽単度は1以上を選択してください',
      'number.max': '楽単度は5以下を選択してください',
      'any.required': '楽単度は必須です'
    }),
  
  fun_rating: Joi.number()
    .integer()
    .min(1)
    .max(5)
    .required()
    .messages({
      'number.base': '面白さ度は選択してください',
      'number.min': '面白さ度は1以上を選択してください',
      'number.max': '面白さ度は5以下を選択してください',
      'any.required': '面白さ度は必須です'
    }),
  
  comment: Joi.string()
    .max(1000)
    .allow('')
    .optional()
    .messages({
      'string.max': 'コメントは1000文字以内で入力してください'
    })
});

module.exports = { reviewSchema };