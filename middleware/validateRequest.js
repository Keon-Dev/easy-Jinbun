/**
 * リクエストボディをバリデーションするミドルウェア
 * @param {Joi.ObjectSchema} schema - Joiスキーマ
 * @returns {Function} Expressミドルウェア関数
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    // バリデーション実行
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // すべてのエラーを取得
      stripUnknown: true // スキーマにないフィールドを削除
    });
    
    if (error) {
      // エラーメッセージを整形
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));
      
      // Content-Typeで判断: JSON APIリクエストかHTMLリクエストか
      const acceptsJson = req.headers.accept && req.headers.accept.includes('application/json');
      const isApiRequest = req.headers['content-type'] && req.headers['content-type'].includes('application/json');
      
      if (acceptsJson || isApiRequest) {
        // JSON APIレスポンス（PostmanなどからのAPI呼び出し用）
        return res.status(400).json({
          success: false,
          error: 'バリデーションエラー',
          details: errors
        });
      } else {
        // HTMLレスポンス（ブラウザからのフォーム送信用）
        return res.status(400).render('error', {
          title: '入力エラー',
          errors: errors
        });
      }
    }
    
    // バリデーション成功時、正規化された値でreq.bodyを上書き
    req.body = value;
    next();
  };
};

module.exports = validateRequest;