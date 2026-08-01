/**
 * One-time fix script: Restore users createRule to allow registration.
 * Run once: node scripts/fix-users-rule.js
 *
 * If you know the admin password, set it below or pass as env var:
 *   ADMIN_PASS=yourpass node scripts/fix-users-rule.js
 */

import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

// Try multiple possible admin credentials
const credentials = [
  { email: 'admin@gochat.internal', password: process.env.ADMIN_PASS || 'Namo_narayan5252' },
  { email: 'admin@example.com', password: 'adminpassword123' },
  { email: 'admin@example.com', password: 'password123' },
];

async function fixUsersRule() {
  let authenticated = false;

  for (const cred of credentials) {
    try {
      await pb.admins.authWithPassword(cred.email, cred.password);
      console.log(`✅ Authenticated as: ${cred.email}`);
      authenticated = true;
      break;
    } catch (_) {
      console.log(`❌ Failed with: ${cred.email}`);
    }
  }

  if (!authenticated) {
    console.error('\n⛔ Could not authenticate with any known credentials.');
    console.error('Go to http://127.0.0.1:8090/_/ and manually set users createRule to empty string ("")');
    process.exit(1);
  }

  // Fix users collection - allow open registration (createRule = "")
  try {
    const usersCol = await pb.collections.getOne('users');
    await pb.collections.update(usersCol.id, {
      createRule: '',        // Empty string = anyone can register (open)
      listRule: "@request.auth.id != ''",
      viewRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id = id",
      deleteRule: "@request.auth.id = id",
    });
    console.log('✅ Users createRule restored — registration is now open!');
  } catch (err) {
    console.error('❌ Failed to update users collection:', err.message);
  }

  // Also ensure all custom collections are properly set up
  const schemaPath = new URL('../pb_schema.json', import.meta.url);
  const { default: fs } = await import('fs');
  const collections = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

  for (const col of collections) {
    try {
      const existing = await pb.collections.getOne(col.name).catch(() => null);
      if (existing) {
        await pb.collections.update(existing.id, col);
        console.log(`✅ Updated: ${col.name}`);
      } else {
        await pb.collections.create(col);
        console.log(`✅ Created: ${col.name}`);
      }
    } catch (e) {
      console.log(`⚠️  ${col.name}: ${e.message}`);
    }
  }

  console.log('\n🎉 Done! Registration should work now.');
  process.exit(0);
}

fixUsersRule();
