import PocketBase from 'pocketbase';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const pb = new PocketBase('http://127.0.0.1:8090');

async function applyRules() {
  console.log('Logging in as PocketBase admin...');
  try {
    await pb.admins.authWithPassword('admin@example.com', 'adminpassword123');
    console.log('Admin authenticated!');

    // Read pb_schema.json
    const schemaPath = path.join(projectRoot, 'pb_schema.json');
    const collections = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));

    // Also update users collection rule
    try {
      const usersCol = await pb.collections.getOne('users');
      await pb.collections.update(usersCol.id, {
        listRule: "@request.auth.id != ''",
        viewRule: "@request.auth.id != ''",
      });
      console.log('Users collection API rules updated: listRule & viewRule enabled for auth users.');
    } catch (err) {
      console.error('Failed to update users collection:', err.message);
    }

    // Import/update other collections
    for (const col of collections) {
      try {
        const existing = await pb.collections.getOne(col.name).catch(() => null);
        if (existing) {
          await pb.collections.update(existing.id, col);
          console.log(`Updated collection: ${col.name}`);
        } else {
          await pb.collections.create(col);
          console.log(`Created collection: ${col.name}`);
        }
      } catch (e) {
        console.error(`Collection ${col.name} note:`, e.message);
      }
    }

    console.log('All PocketBase collection rules applied successfully!');
  } catch (err) {
    console.error('Failed to apply rules:', err);
  }
}

applyRules();
