const createDOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

const window = new JSDOM('').window;
const DOMPurify = createDOMPurify(window);

// サニタイズ関数
const sanitize = (dirty) => {
  return DOMPurify.sanitize(dirty);
};

// オブジェクトの各値を再帰的にサニタイズ
const sanitizeObject = (obj) => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  const sanitizedObj = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      if (typeof value === 'string') {
        sanitizedObj[key] = sanitize(value);
      } else {
        sanitizedObj[key] = sanitizeObject(value);
      }
    }
  }
  return sanitizedObj;
};

module.exports = {
  sanitize,
  sanitizeObject
};