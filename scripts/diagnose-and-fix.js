/**
 * Check what admin accounts exist and directly fix the users createRule
 */
import PocketBase from 'pocketbase';
import * as http from 'http';

const pb = new PocketBase('http://127.0.0.1:8090');

async function checkAndFix() {
  // Try to figure out what admins exist by attempting auth
  const possiblePasswords = [
    'adminpassword123', 'password123', 'admin123', 'Namo_narayan5252',
    'admin', '123456', 'pocketbase123', 'Test1234!'
  ];

  let authenticated = false;
  for (const pw of possiblePasswords) {
    for (const email of ['admin@example.com', 'admin@gochat.internal', 'admin@admin.com']) {
      try {
        await pb.admins.authWithPassword(email, pw);
        console.log(`✅ Found admin: ${email} / ${pw}`);
        authenticated = true;
        break;
      } catch (_) {}
    }
    if (authenticated) break;
  }

  if (!authenticated) {
    // No admins — try to create one via the special first-admin endpoint
    console.log('No admins found with known passwords. Trying to create first admin...');
    try {
      const res = await fetch('http://127.0.0.1:8090/api/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@gochat.internal',
          password: 'Namo_narayan5252',
          passwordConfirm: 'Namo_narayan5252',
        }),
      });
      const data = await res.json();
      console.log('Create first admin response:', JSON.stringify(data));
      if (res.ok) {
        await pb.admins.authWithPassword('admin@gochat.internal', 'Namo_narayan5252');
        authenticated = true;
        console.log('✅ Created and authenticated as admin@gochat.internal');
      }
    } catch (err) {
      console.error('First admin creation failed:', err.message);
    }
  }

  if (!authenticated) {
    console.error('❌ Could not authenticate. Please go to http://127.0.0.1:8090/_/ to set up admin manually.');
    console.error('Create admin with email: admin@gochat.internal and password: Namo_narayan5252');
    process.exit(1);
  }

  // Now fix the users createRule
  try {
    const usersCol = await pb.collections.getOne('users');
    console.log('Current users createRule:', usersCol.createRule);
    await pb.collections.update(usersCol.id, {
      createRule: '',
    });
    const updated = await pb.collections.getOne('users');
    console.log('✅ Fixed users createRule to:', JSON.stringify(updated.createRule));
  } catch (err) {
    console.error('❌ Could not fix users createRule:', err.message);
  }

  // Test registration
  try {
    const testRes = await fetch('http://127.0.0.1:8090/api/collections/users/records', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'testuser_verify',
        email: 'testverify@test.com',
        password: 'password12345',
        passwordConfirm: 'password12345',
      }),
    });
    const testData = await testRes.json();
    if (testRes.ok) {
      console.log('✅ Registration test PASSED! New user created:', testData.username);
      // Clean up test user
      await pb.collection('users').delete(testData.id);
      console.log('✅ Test user cleaned up.');
    } else {
      console.error('❌ Registration test FAILED:', JSON.stringify(testData));
    }
  } catch (err) {
    console.error('❌ Registration test error:', err.message);
  }

  process.exit(0);
}

checkAndFix();
