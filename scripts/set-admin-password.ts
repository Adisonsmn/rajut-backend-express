// Script: set password for admin user
// Jalankan dari root project: npx tsx scripts/set-admin-password.ts

import 'dotenv/config';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import bcrypt from 'bcryptjs';
import pg from 'pg';

const ADMIN_EMAIL = 'idk@gmail.com';
const NEW_PASSWORD = 'Admin12345!';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL not set in .env');

  const pool = new pg.Pool({ connectionString, ssl: { rejectUnauthorized: false } });

  const hash = await bcrypt.hash(NEW_PASSWORD, 12);
  console.log(`\nHashed: ${hash.substring(0, 20)}...\n`);

  const result = await pool.query(
    `UPDATE users SET password = $1, updated_at = NOW() WHERE email = $2 RETURNING id, email, role`,
    [hash, ADMIN_EMAIL]
  );

  if (result.rows.length === 0) {
    console.error(`User with email "${ADMIN_EMAIL}" not found!`);
    process.exit(1);
  }

  const user = result.rows[0];
  console.log('✅ Password updated successfully!');
  console.log(`   Email  : ${user.email}`);
  console.log(`   Role   : ${user.role}`);
  console.log(`   ID     : ${user.id}`);
  console.log('\n🔑 Gunakan credentials ini untuk login admin:');
  console.log(`   Email    : ${ADMIN_EMAIL}`);
  console.log(`   Password : ${NEW_PASSWORD}`);
  console.log('\n   URL: http://localhost:5173/admin\n');

  await pool.end();
}

main().catch((e) => {
  console.error('Error:', e.message);
  process.exit(1);
});
