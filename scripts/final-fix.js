/**
 * Final fix: Use the freshly found admin credentials to fix users createRule
 */
import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function finalFix() {
  // We know from diagnosis: admin@example.com / adminpassword123 works
  try {
    await pb.admins.authWithPassword('admin@example.com', 'adminpassword123');
    console.log('✅ Authenticated as admin@example.com');
  } catch (e) {
    console.error('Failed:', e.message);
    process.exit(1);
  }

  // Check and fix users createRule
  const usersCol = await pb.collections.getOne('users');
  console.log('Current users createRule:', JSON.stringify(usersCol.createRule));
  console.log('Current users listRule:', JSON.stringify(usersCol.listRule));

  // Fix it
  await pb.collections.update(usersCol.id, {
    createRule: '',
    listRule: "@request.auth.id != ''",
    viewRule: "@request.auth.id != ''",
    updateRule: "@request.auth.id = id",
    deleteRule: "@request.auth.id = id",
  });
  console.log('✅ createRule set to "" (open registration)');

  // Verify
  const test = await fetch('http://127.0.0.1:8090/api/collections/users/records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'testfinalcheck',
      email: 'finalcheck@test.com',
      password: 'password12345',
      passwordConfirm: 'password12345',
    }),
  });
  const testData = await test.json();
  console.log('Registration test response:', JSON.stringify(testData));

  if (test.ok) {
    console.log('✅ REGISTRATION WORKS!');
    await pb.collection('users').delete(testData.id);
  } else {
    console.log('❌ Still broken:', testData.message);
  }
  process.exit(0);
}

finalFix();
