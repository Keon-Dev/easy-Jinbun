// UUID生成には uuid パッケージを使用するため、ブラウザ側でCDNから読み込む必要があります
// ただし、npm の uuid パッケージはNode.js向けなので、ブラウザ用の代替実装を提供します

// シンプルなUUID v4生成関数（RFC4122準拠）
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// UUID管理
function getUserUUID() {
  let uuid = localStorage.getItem('user_uuid');
  
  if (!uuid) {
    uuid = generateUUID();
    localStorage.setItem('user_uuid', uuid);
    console.log('新規UUID生成:', uuid);
  }
  
  return uuid;
}

// レビューフォームにUUIDを注入
document.addEventListener('DOMContentLoaded', function() {
  const reviewForm = document.getElementById('reviewForm');
  
  if (reviewForm) {
    const userUuidInput = document.getElementById('userUuidInput');
    if (userUuidInput) {
      userUuidInput.value = getUserUUID();
    }
  }
});

