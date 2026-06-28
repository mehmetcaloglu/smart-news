import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'news.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS news (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT,
      image TEXT,
      link TEXT UNIQUE NOT NULL,
      published TEXT,
      source TEXT,
      sentiment_label TEXT,
      sentiment_score REAL
    );

    CREATE TABLE IF NOT EXISTS sources (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      url TEXT UNIQUE NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed sources from rss_sources.json if sources table is empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM sources').get() as { c: number }).c;
  if (count === 0) {
    const configPath = path.join(process.cwd(), 'config', 'rss_sources.json');
    if (fs.existsSync(configPath)) {
      const urls: string[] = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      const insert = db.prepare('INSERT OR IGNORE INTO sources (url) VALUES (?)');
      const insertMany = db.transaction((items: string[]) => {
        for (const url of items) insert.run(url);
      });
      insertMany(urls);
      console.log(`[DB] Seeded ${urls.length} RSS sources from config file.`);
    }
  }

  return db;
}
