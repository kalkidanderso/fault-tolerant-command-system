/**
 * Database schema initialization and migrations
 */

import Database from 'better-sqlite3';
import { logger } from '../utils/logger';

/**
 * Initialize database schema
 */
export function initializeSchema(db: Database.Database): void {
    logger.info('Initializing database schema');

    // Create commands table
    db.exec(`
    CREATE TABLE IF NOT EXISTS commands (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL,
      result TEXT,
      agent_id TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      started_at INTEGER,
      completed_at INTEGER
    );
  `);

    // Create indexes for performance
    db.exec(`
    CREATE INDEX IF NOT EXISTS idx_status ON commands(status);
    CREATE INDEX IF NOT EXISTS idx_agent_id ON commands(agent_id);
    CREATE INDEX IF NOT EXISTS idx_created_at ON commands(created_at);
  `);

    logger.info('Database schema initialized successfully');
}

/**
 * Get database version for future migrations
 */
export function getDatabaseVersion(db: Database.Database): number {
    try {
        const result = db.prepare('PRAGMA user_version').get() as { user_version: number };
        return result.user_version;
    } catch {
        return 0;
    }
}

/**
 * Set database version
 */
export function setDatabaseVersion(db: Database.Database, version: number): void {
    db.exec(`PRAGMA user_version = ${version}`);
}
