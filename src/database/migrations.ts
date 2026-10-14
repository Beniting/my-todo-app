import type { SQLiteDatabase } from 'expo-sqlite';

export const DATABASE_NAME = 'mytodo.db';
export const CURRENT_SCHEMA_VERSION = 1;

/**
 * Executes SQLite migrations incrementally based on PRAGMA user_version
 */
export async function migrateDb(db: SQLiteDatabase): Promise<void> {
  // Enable foreign keys and WAL mode for better concurrency and safety
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  const versionResult = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = versionResult?.user_version ?? 0;

  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      // 1. Create tasks table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY NOT NULL,
          title TEXT NOT NULL,
          description TEXT,
          priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
          category TEXT,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
          due_at TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          completed_at TEXT,
          deleted_at TEXT,
          reminder_at TEXT,
          notification_id TEXT
        );
      `);

      // 2. Create task_history table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS task_history (
          id TEXT PRIMARY KEY NOT NULL,
          task_id TEXT NOT NULL,
          action TEXT NOT NULL,
          details TEXT,
          occurred_at TEXT NOT NULL,
          snapshot_json TEXT
        );
      `);

      // 3. Create performance indexes
      await db.execAsync(`
        CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON tasks(status, due_at);
        CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(deleted_at);
        CREATE INDEX IF NOT EXISTS idx_history_task_time ON task_history(task_id, occurred_at);
        CREATE INDEX IF NOT EXISTS idx_history_occurred ON task_history(occurred_at);
      `);

      // 4. Update user_version
      await db.execAsync('PRAGMA user_version = 1;');
    });
  }
}
