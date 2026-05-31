/**
 * backend/scripts/createAdmin.js
 * ─────────────────────────────────────────────────────────────
 * One-time script to create the first admin user.
 *
 * Usage:
 *   node scripts/createAdmin.js
 *
 * Or with custom credentials:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=yourpass node scripts/createAdmin.js
 * ─────────────────────────────────────────────────────────────
 */
'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const userService = require('../services/userService');

const ADMIN_NAME     = process.env.ADMIN_NAME     || 'Admin';
const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    || 'admin@saferoute.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@1234';

async function main() {
  console.log('\n🚦 SafeRoute — Create Admin User');
  console.log('─'.repeat(40));
  console.log(`  Name:     ${ADMIN_NAME}`);
  console.log(`  Email:    ${ADMIN_EMAIL}`);
  console.log(`  Password: ${ADMIN_PASSWORD}`);
  console.log('─'.repeat(40));

  try {
    // Check if already exists
    const existing = await userService.findUserByEmail(ADMIN_EMAIL);
    if (existing) {
      if (existing.role === 'admin') {
        console.log('\n✅ Admin already exists — nothing to do.');
        console.log(`   Login at: http://localhost:5173/login`);
        process.exit(0);
      } else {
        // Promote existing user to admin
        await userService.updateUserRole(existing.id, 'admin');
        console.log(`\n✅ User "${ADMIN_EMAIL}" promoted to admin!`);
        console.log(`   Login at: http://localhost:5173/login`);
        process.exit(0);
      }
    }

    // Create fresh admin
    const admin = await userService.createUser({
      name:     ADMIN_NAME,
      email:    ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      role:     'admin',
    });

    console.log('\n✅ Admin user created successfully!');
    console.log(`   ID:    ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role:  ${admin.role}`);
    console.log('\n👉 Login at: http://localhost:5173/login');
    console.log('   Then navigate to: http://localhost:5173/admin\n');
  } catch (err) {
    console.error('\n❌ Error:', err.message);
  }

  // Give async Firebase writes a moment to settle before exit
  setTimeout(() => process.exit(0), 2000);
}

main();
