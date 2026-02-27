import { initDb } from '../db.js';

(async () => {
  const db = await initDb();
  await db.exec('DELETE FROM users');
  await db.exec('DELETE FROM auth_codes');
  await db.exec('DELETE FROM sessions');
  console.log('Database cleared.');
  await db.close();
})();
