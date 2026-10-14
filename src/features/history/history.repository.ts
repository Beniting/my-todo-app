import type { SQLiteDatabase } from 'expo-sqlite';
import { CreateHistoryInput, HistoryAction, TaskHistoryEntry } from './history.types';
import { generateId } from '@/utils/ids';
import { toIsoString } from '@/utils/date';

export class HistoryRepository {
  /**
   * Inserts a history record. Can be executed inside an external transaction.
   */
  static async record(
    db: SQLiteDatabase,
    input: CreateHistoryInput
  ): Promise<TaskHistoryEntry> {
    const entry: TaskHistoryEntry = {
      id: generateId(),
      task_id: input.task_id,
      action: input.action,
      details: input.details ?? null,
      occurred_at: input.occurred_at ?? toIsoString(),
      snapshot_json: input.snapshot_json ?? null,
    };

    await db.runAsync(
      `INSERT INTO task_history (id, task_id, action, details, occurred_at, snapshot_json)
       VALUES (?, ?, ?, ?, ?, ?);`,
      entry.id,
      entry.task_id,
      entry.action,
      entry.details,
      entry.occurred_at,
      entry.snapshot_json
    );

    return entry;
  }

  /**
   * Retrieves all history events for a given task ID, ordered latest first.
   */
  static async getByTaskId(db: SQLiteDatabase, taskId: string): Promise<TaskHistoryEntry[]> {
    return await db.getAllAsync<TaskHistoryEntry>(
      `SELECT * FROM task_history WHERE task_id = ? ORDER BY occurred_at DESC, id DESC;`,
      taskId
    );
  }

  /**
   * Retrieves chronological history events joined with task titles for the audit timeline.
   */
  static async getTimeline(
    db: SQLiteDatabase,
    options?: {
      action?: HistoryAction;
      limit?: number;
      offset?: number;
    }
  ): Promise<TaskHistoryEntry[]> {
    const limit = options?.limit ?? 100;
    const offset = options?.offset ?? 0;

    if (options?.action) {
      return await db.getAllAsync<TaskHistoryEntry>(
        `SELECT h.*, t.title as task_title
         FROM task_history h
         LEFT JOIN tasks t ON h.task_id = t.id
         WHERE h.action = ?
         ORDER BY h.occurred_at DESC, h.id DESC
         LIMIT ? OFFSET ?;`,
        options.action,
        limit,
        offset
      );
    }

    return await db.getAllAsync<TaskHistoryEntry>(
      `SELECT h.*, t.title as task_title
       FROM task_history h
       LEFT JOIN tasks t ON h.task_id = t.id
       ORDER BY h.occurred_at DESC, h.id DESC
       LIMIT ? OFFSET ?;`,
      limit,
      offset
    );
  }
}
