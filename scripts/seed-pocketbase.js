import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function seed() {
  console.log('Seeding test users...');
  try {
    const user1 = await pb.collection('users').create({
      username: 'alice_dev',
      email: 'alice@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      bio: 'Frontend Architect & UI Designer',
      online: true,
    }).catch((e) => console.log('Alice might already exist:', e.message));

    const user2 = await pb.collection('users').create({
      username: 'bob_builder',
      email: 'bob@example.com',
      password: 'password123',
      passwordConfirm: 'password123',
      bio: 'Fullstack Engineer & Backend Lead',
      online: false,
    }).catch((e) => console.log('Bob might already exist:', e.message));

    console.log('Users seeded successfully!');
  } catch (err) {
    console.error('Seeding error:', err);
  }
}

seed();
