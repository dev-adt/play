import { db } from '../db/database.js';
import { hashPassword } from '../auth/auth.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Sử dụng: npm run admin:reset-password -- <username> <new_password>');
    process.exit(1);
  }

  const [username, newPassword] = args;
  await db.init();

  const user = await db.getUserByUsername(username);
  if (!user) {
    console.error(`Không tìm thấy tài khoản với tên đăng nhập: "${username}"`);
    process.exit(1);
  }

  const hash = await hashPassword(newPassword);
  const success = await db.updateUserPassword(username, hash);

  if (success) {
    console.log(`Đã đặt lại mật khẩu thành công cho tài khoản "${username}".`);
  } else {
    console.error(`Không thể cập nhật mật khẩu cho "${username}".`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Lỗi khi thực hiện đặt lại mật khẩu:', err);
  process.exit(1);
});
