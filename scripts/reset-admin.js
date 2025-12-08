const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('../models/Admin');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

async function resetAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/course-wiki');
    
    console.log('\n⚠️  警告: すべての管理者アカウントを削除します\n');
    
    const confirm = await question('本当に削除しますか？ (yes/no): ');
    
    if (confirm.toLowerCase() !== 'yes') {
      console.log('キャンセルしました');
      process.exit(0);
    }
    
    const result = await Admin.deleteMany({});
    console.log(`\n✅ ${result.deletedCount}件の管理者アカウントを削除しました`);
    console.log('💡 npm run create-admin で新しい管理者を作成できます\n');
    
  } catch (err) {
    console.error('エラー:', err.message);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

resetAdmin();