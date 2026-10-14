import * as SQLite from 'expo-sqlite';
import { DATABASE_NAME, migrateDb } from './migrations';

let dbInstance: SQLite.SQLiteDatabase | null = null;

/**
 * Initializes and returns the shared SQLite database instance.
 */
export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!dbInstance) {
    dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await migrateDb(dbInstance);
  }
  return dbInstance;
}

/**
 * Closes and resets the database instance (useful for testing or full resets)
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
