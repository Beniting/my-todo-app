import type { SQLiteDatabase } from 'expo-sqlite';
import {
  CreateTaskInput,
  Task,
  TaskFilterOptions,
  TaskSortOptions,
  UpdateTaskInput,
} from './task.types';
import { HistoryRepository } from '../history/history.repository';
import { generateId } from '@/utils/ids';
import { toDateOnlyString, toIsoString } from '@/utils/date';

export class TaskRepository {
  /**
   * Retrieves tasks with flexible filtering and sorting.
   */
  static async getTasks(
    db: SQLiteDatabase,
    filter: TaskFilterOptions = {},
    sort: TaskSortOptions = { field: 'created_at', direction: 'desc' }
  ): Promise<Task[]> {
    const conditions: string[] = [];
    const params: (string | number)[] = [];

    // Soft-delete filter
    if (!filter.includeDeleted) {
      conditions.push('deleted_at IS NULL');
    }

    // Status filter
    if (filter.status && filter.status !== 'all') {
      conditions.push('status = ?');
      params.push(filter.status);
    }

    // Priority filter
    if (filter.priority && filter.priority !== 'all') {
      conditions.push('priority = ?');
      params.push(filter.priority);
    }

    // Category filter
    if (filter.category && filter.category !== 'all') {
      conditions.push('category = ?');
      params.push(filter.category);
    }

    // Search query filter (title and description)
    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      conditions.push('(title LIKE ? OR description LIKE ?)');
      const wildcard = `%${filter.searchQuery.trim()}%`;
      params.push(wildcard, wildcard);
    }

    // Due today filter
    if (filter.dueTodayOnly) {
      const today = toDateOnlyString();
      conditions.push('due_at IS NOT NULL AND due_at LIKE ?');
      params.push(`${today}%`);
    }

    // Overdue filter
    if (filter.overdueOnly) {
      const nowIso = toIsoString();
      conditions.push("status = 'pending' AND due_at IS NOT NULL AND due_at < ?");
      params.push(nowIso);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Sort order
    let sortColumn = 'created_at';
    if (sort.field === 'due_at') {
      sortColumn = 'CASE WHEN due_at IS NULL THEN 1 ELSE 0 END, due_at';
    } else if (sort.field === 'priority') {
      sortColumn = `CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 ELSE 4 END`;
    } else if (sort.field === 'title') {
      sortColumn = 'title COLLATE NOCASE';
    } else {
      sortColumn = 'created_at';
    }

    const direction = sort.direction.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    const query = `SELECT * FROM tasks ${whereClause} ORDER BY ${sortColumn} ${direction};`;

    return await db.getAllAsync<Task>(query, ...params);
  }

  /**
   * Retrieves a single task by ID.
   */
  static async getById(db: SQLiteDatabase, id: string): Promise<Task | null> {
    return await db.getFirstAsync<Task>(`SELECT * FROM tasks WHERE id = ?;`, id);
  }

  /**
   * Creates a new task and inserts a 'created' history record inside a transaction.
   */
  static async create(db: SQLiteDatabase, input: CreateTaskInput): Promise<Task> {
    const now = toIsoString();
    const task: Task = {
      id: generateId(),
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority || 'medium',
      category: input.category || null,
      status: 'pending',
      due_at: input.due_at || null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      deleted_at: null,
      reminder_at: input.reminder_at || null,
      notification_id: null,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO tasks (
          id, title, description, priority, category, status,
          due_at, created_at, updated_at, completed_at, deleted_at,
          reminder_at, notification_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        task.id,
        task.title,
        task.description,
        task.priority,
        task.category,
        task.status,
        task.due_at,
        task.created_at,
        task.updated_at,
        task.completed_at,
        task.deleted_at,
        task.reminder_at,
        task.notification_id
      );

      await HistoryRepository.record(db, {
        task_id: task.id,
        action: 'created',
        details: `Task "${task.title}" created`,
        snapshot_json: JSON.stringify(task),
        occurred_at: now,
      });
    });

    return task;
  }

  /**
   * Updates an existing task and logs an 'updated' history record in a transaction.
   */
  static async update(
    db: SQLiteDatabase,
    id: string,
    updates: UpdateTaskInput
  ): Promise<Task | null> {
    let updatedResult: Task | null = null;

    await db.withTransactionAsync(async () => {
      const existing = await this.getById(db, id);
      if (!existing) return;

      const now = toIsoString();
      const changes: string[] = [];

      const updatedTask: Task = {
        ...existing,
        title: updates.title !== undefined ? updates.title.trim() : existing.title,
        description:
          updates.description !== undefined
            ? updates.description?.trim() || null
            : existing.description,
        priority: updates.priority ?? existing.priority,
        category: updates.category !== undefined ? updates.category : existing.category,
        status: updates.status ?? existing.status,
        due_at: updates.due_at !== undefined ? updates.due_at : existing.due_at,
        reminder_at:
          updates.reminder_at !== undefined ? updates.reminder_at : existing.reminder_at,
        notification_id:
          updates.notification_id !== undefined
            ? updates.notification_id
            : existing.notification_id,
        updated_at: now,
      };

      if (updates.title && updates.title.trim() !== existing.title) {
        changes.push(`title changed from "${existing.title}" to "${updatedTask.title}"`);
      }
      if (updates.priority && updates.priority !== existing.priority) {
        changes.push(`priority changed from ${existing.priority} to ${updatedTask.priority}`);
      }
      if (updates.due_at !== undefined && updates.due_at !== existing.due_at) {
        changes.push('due date changed');
      }
      if (updates.category !== undefined && updates.category !== existing.category) {
        changes.push(`category changed to ${updatedTask.category || 'none'}`);
      }
      if (updates.description !== undefined && updates.description !== existing.description) {
        changes.push('description updated');
      }

      await db.runAsync(
        `UPDATE tasks SET
          title = ?,
          description = ?,
          priority = ?,
          category = ?,
          status = ?,
          due_at = ?,
          updated_at = ?,
          reminder_at = ?,
          notification_id = ?
        WHERE id = ?;`,
        updatedTask.title,
        updatedTask.description,
        updatedTask.priority,
        updatedTask.category,
        updatedTask.status,
        updatedTask.due_at,
        updatedTask.updated_at,
        updatedTask.reminder_at,
        updatedTask.notification_id,
        id
      );

      if (changes.length > 0) {
        await HistoryRepository.record(db, {
          task_id: id,
          action: 'updated',
          details: `Updated: ${changes.join(', ')}`,
          snapshot_json: JSON.stringify(updatedTask),
          occurred_at: now,
        });
      }

      updatedResult = updatedTask;
    });

    return updatedResult;
  }

  /**
   * Marks a task as complete and logs a 'completed' event in a transaction.
   */
  static async complete(db: SQLiteDatabase, id: string): Promise<Task | null> {
    let completedResult: Task | null = null;

    await db.withTransactionAsync(async () => {
      const existing = await this.getById(db, id);
      if (!existing) return;

      const now = toIsoString();
      await db.runAsync(
        `UPDATE tasks SET
          status = 'completed',
          completed_at = ?,
          updated_at = ?
        WHERE id = ?;`,
        now,
        now,
        id
      );

      await HistoryRepository.record(db, {
        task_id: id,
        action: 'completed',
        details: `Task "${existing.title}" marked as complete`,
        snapshot_json: JSON.stringify({ ...existing, status: 'completed', completed_at: now }),
        occurred_at: now,
      });

      completedResult = {
        ...existing,
        status: 'completed',
        completed_at: now,
        updated_at: now,
      };
    });

    return completedResult;
  }

  /**
   * Reopens a completed task and logs a 'reopened' event in a transaction.
   */
  static async reopen(db: SQLiteDatabase, id: string): Promise<Task | null> {
    let reopenedResult: Task | null = null;

    await db.withTransactionAsync(async () => {
      const existing = await this.getById(db, id);
      if (!existing) return;

      const now = toIsoString();
      await db.runAsync(
        `UPDATE tasks SET
          status = 'pending',
          completed_at = NULL,
          updated_at = ?
        WHERE id = ?;`,
        now,
        id
      );

      await HistoryRepository.record(db, {
        task_id: id,
        action: 'reopened',
        details: `Task "${existing.title}" reopened`,
        snapshot_json: JSON.stringify({ ...existing, status: 'pending', completed_at: null }),
        occurred_at: now,
      });

      reopenedResult = {
        ...existing,
        status: 'pending',
        completed_at: null,
        updated_at: now,
      };
    });

    return reopenedResult;
  }

  /**
   * Soft-deletes a task and logs a 'deleted' event in a transaction.
   */
  static async delete(db: SQLiteDatabase, id: string): Promise<boolean> {
    let deletedSuccess = false;

    await db.withTransactionAsync(async () => {
      const existing = await this.getById(db, id);
      if (!existing) return;

      const now = toIsoString();
      await db.runAsync(
        `UPDATE tasks SET
          deleted_at = ?,
          updated_at = ?
        WHERE id = ?;`,
        now,
        now,
        id
      );

      await HistoryRepository.record(db, {
        task_id: id,
        action: 'deleted',
        details: `Task "${existing.title}" deleted`,
        snapshot_json: JSON.stringify(existing),
        occurred_at: now,
      });

      deletedSuccess = true;
    });

    return deletedSuccess;
  }

  /**
   * Restores a soft-deleted task.
   */
  static async restore(db: SQLiteDatabase, id: string): Promise<boolean> {
    let restoredSuccess = false;

    await db.withTransactionAsync(async () => {
      const existing = await this.getById(db, id);
      if (!existing) return;

      const now = toIsoString();
      await db.runAsync(
        `UPDATE tasks SET
          deleted_at = NULL,
          updated_at = ?
        WHERE id = ?;`,
        now,
        id
      );

      await HistoryRepository.record(db, {
        task_id: id,
        action: 'updated',
        details: `Task "${existing.title}" restored from trash`,
        snapshot_json: JSON.stringify({ ...existing, deleted_at: null }),
        occurred_at: now,
      });

      restoredSuccess = true;
    });

    return restoredSuccess;
  }
}
