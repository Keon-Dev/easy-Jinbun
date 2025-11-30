// UUID生成には uuid パッケージを使用するため、ブラウザ側でCDNから読み込む必要があります
// ただし、npm の uuid パッケージはNode.js向けなので、ブラウザ用の代替実装を提供します

// シンプルなUUID v4生成関数（RFC4122準拠）
function generateUUID() {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);

  // version 4
  buf[6] = (buf[6] & 0x0f) | 0x40;
  // variant
  buf[8] = (buf[8] & 0x3f) | 0x80;

  const hex = [...buf].map(b => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
};

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

