import sqlite3 from 'sqlite3';
import { open } from 'sqlite';

export async function initDb() {
  const db = await open({
    filename: './db.sqlite',
    driver: sqlite3.Database
  });

  // Users table
  await db.exec(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME
  )`);

  // Auth codes table
  await db.exec(`CREATE TABLE IF NOT EXISTS auth_codes (
    email TEXT NOT NULL,
    otp_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    attempts INTEGER DEFAULT 0,
    PRIMARY KEY(email)
  )`);

  // Sessions table
  await db.exec(`CREATE TABLE IF NOT EXISTS sessions (
    user_id INTEGER NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    device TEXT,
    PRIMARY KEY(refresh_token)
  )`);

  return db;
}
