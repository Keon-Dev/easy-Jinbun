const mongoose = require('mongoose');
const readline = require('readline');
const Admin = require('../models/Admin');
require('dotenv').config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// プロンプトのPromise化
function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// パスワード非表示入力（簡易版）
function questionSecret(query) {
  return new Promise((resolve) => {
    process.stdout.write(query);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    
    let password = '';
    
    process.stdin.on('data', (char) => {
      char = char.toString('utf-8');
      
      switch (char) {
        case '\n':
        case '\r':
        case '\u0004': // Ctrl+D
          process.stdin.setRawMode(false);
          process.stdin.pause();
          process.stdout.write('\n');
          resolve(password);
          break;
        case '\u0003': // Ctrl+C
          process.exit();
          break;
        case '\u007f': // Backspace
          if (password.length > 0) {
            password = password.slice(0, -1);
            process.stdout.clearLine();
            process.stdout.cursorTo(0);
            process.stdout.write(query + '*'.repeat(password.length));
          }
          break;
        default:
          password += char;
          process.stdout.write('*');
          break;
      }
    });
  });
}

async function createAdmin() {
  try {
    // MongoDB接続
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/course-wiki', {
      // useNewUrlParser: true,
      // useUnifiedTopology: true
    });
    
    console.log('MongoDB接続成功\n');
    
    // 既存の管理者チェック
    const existingAdminCount = await Admin.countDocuments();
    
    if (existingAdminCount > 0) {
      console.log('=================================');
      console.log('   ⚠️  アクセス拒否');
      console.log('=================================\n');
      console.log('❌ 既に管理者アカウントが存在します。');
      console.log('❌ セキュリティ上、追加の管理者作成は許可されていません。\n');
      console.log('既存の管理者情報:');
      
      const admins = await Admin.find().select('username createdAt lastLogin');
      admins.forEach((admin, index) => {
        console.log(`\n${index + 1}. ユーザー名: ${admin.username}`);
        console.log(`   作成日: ${admin.createdAt.toLocaleString('ja-JP')}`);
        if (admin.lastLogin) {
          console.log(`   最終ログイン: ${admin.lastLogin.toLocaleString('ja-JP')}`);
        }
      });
      
      console.log('\n=================================');
      console.log('💡 既存の管理者アカウントでログインしてください。');
      console.log('💡 パスワードを忘れた場合は、MongoDBから直接削除して再作成してください。');
      console.log('=================================\n');
      
      process.exit(1);
    }
    
    console.log('=================================');
    console.log('   👤 初回管理者アカウント作成');
    console.log('=================================\n');
    console.log('⚠️  このスクリプトは初回のみ実行可能です');
    console.log('⚠️  作成した認証情報は安全に保管してください\n');
    
    // マスターパスワード確認（オプション、環境変数で設定）
    if (process.env.MASTER_PASSWORD) {
      console.log('🔐 マスターパスワードが設定されています\n');
      const masterPassword = await questionSecret('マスターパスワードを入力してください: ');
      
      if (masterPassword !== process.env.MASTER_PASSWORD) {
        console.log('\n❌ エラー: マスターパスワードが正しくありません');
        process.exit(1);
      }
      console.log('✅ 認証成功\n');
    }
    
    // ユーザー名入力
    const username = await question('ユーザー名を入力してください（3文字以上）: ');
    
    if (!username || username.length < 3) {
      console.log('\n❌ エラー: ユーザー名は3文字以上で入力してください');
      process.exit(1);
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      console.log('\n❌ エラー: ユーザー名は半角英数字、アンダースコア、ハイフンのみ使用できます');
      process.exit(1);
    }
    
    // パスワード入力
    console.log('\nパスワード要件:');
    console.log('  - 8文字以上');
    console.log('  - 大文字、小文字、数字を含むことを推奨\n');
    
    const password = await questionSecret('パスワードを入力してください: ');
    
    if (!password || password.length < 8) {
      console.log('\n❌ エラー: パスワードは8文字以上で入力してください');
      process.exit(1);
    }
    
    // パスワード確認
    const passwordConfirm = await questionSecret('パスワードを再入力してください: ');
    
    if (password !== passwordConfirm) {
      console.log('\n❌ エラー: パスワードが一致しません');
      process.exit(1);
    }
    
    // 管理者作成
    const admin = new Admin({
      username,
      password
    });
    
    await admin.save();
    
    console.log('\n✅ 管理者アカウントを作成しました！');
    console.log('\n=================================');
    console.log('   🔑 ログイン情報');
    console.log('=================================');
    console.log(`URL: http://localhost:3000/admin/login`);
    console.log(`ユーザー名: ${username}`);
    console.log(`パスワード: ${password}`);
    console.log('\n⚠️  この情報を安全な場所に保管してください');
    console.log('⚠️  パスワードは二度と表示されません');
    console.log('=================================\n');
    
  } catch (err) {
    console.error('\n❌ エラーが発生しました:', err.message);
    process.exit(1);
  } finally {
    rl.close();
    await mongoose.connection.close();
    process.exit(0);
  }
}

// スクリプト実行
createAdmin();