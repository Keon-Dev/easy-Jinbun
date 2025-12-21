const xss = require('xss');

// 全HTMLタグを禁止（プレーンテキストのみ許可）
const options = {
  whiteList: {},
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
  css: false
};

/**
 * 文字列をサニタイズ（XSS対策）
 * @param {string} dirty - サニタイズ対象の文字列
 * @returns {string} サニタイズ済み文字列
 */
const sanitize = (dirty) => {
  if (typeof dirty !== 'string') {
    return dirty;
  }

  // xssライブラリでサニタイズ
  return xss(dirty, options);
};

/**
 * オブジェクトの各値を再帰的にサニタイズ
 * @param {*} obj - サニタイズ対象のオブジェクト
 * @returns {*} サニタイズ済みオブジェクト
 */
const sanitizeObject = (obj) => {
  // null または非オブジェクトの場合
  if (obj === null || typeof obj !== 'object') {
    return typeof obj === 'string' ? sanitize(obj) : obj;
  }

  // 配列の場合
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // オブジェクトの場合
  const sanitizedObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitizedObj[key] = sanitizeObject(obj[key]);
    }
  }
  return sanitizedObj;
};

module.exports = {
  sanitize,
  sanitizeObject
};
