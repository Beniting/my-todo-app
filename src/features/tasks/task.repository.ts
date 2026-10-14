import type { SQLiteDatabase } from 'expo-sqlite';
import {
  CreateTaskInput,
  Task,
  TaskFilterOptions,
  TaskSortOptions,
  UpdateTaskInput,
} from './task.types';
import { HistoryRepository } from '../history/history.repository';
import { ReminderService } from '../reminders/reminder.service';
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

    // Due today filter (checks due_at or start_at)
    if (filter.dueTodayOnly) {
      const today = toDateOnlyString();
      conditions.push(
        '((due_at IS NOT NULL AND due_at LIKE ?) OR (start_at IS NOT NULL AND start_at LIKE ?))'
      );
      params.push(`${today}%`, `${today}%`);
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
    } else if (sort.field === 'start_at') {
      sortColumn = 'CASE WHEN start_at IS NULL THEN 1 ELSE 0 END, start_at';
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
   * Creates a new task, schedules notifications, and inserts a 'created' history record.
   */
  static async create(db: SQLiteDatabase, input: CreateTaskInput): Promise<Task> {
    const now = toIsoString();
    const taskId = generateId();

    // Schedule reminders if times provided
    const reminders = await ReminderService.scheduleTaskReminders({
      id: taskId,
      title: input.title.trim(),
      start_at: input.start_at || null,
      due_at: input.due_at || null,
      status: 'pending',
    });

    const task: Task = {
      id: taskId,
      title: input.title.trim(),
      description: input.description?.trim() || null,
      priority: input.priority || 'medium',
      category: input.category || null,
      status: 'pending',
      start_at: input.start_at || null,
      due_at: input.due_at || null,
      created_at: now,
      updated_at: now,
      completed_at: null,
      deleted_at: null,
      reminder_at: input.reminder_at || null,
      notification_id: reminders.startNotificationId || reminders.dueNotificationId || null,
      start_notification_id: reminders.startNotificationId,
      due_notification_id: reminders.dueNotificationId,
    };

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `INSERT INTO tasks (
          id, title, description, priority, category, status,
          start_at, due_at, created_at, updated_at, completed_at, deleted_at,
          reminder_at, notification_id, start_notification_id, due_notification_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        task.id,
        task.title,
        task.description,
        task.priority,
        task.category,
        task.status,
        task.start_at,
        task.due_at,
        task.created_at,
        task.updated_at,
        task.completed_at,
        task.deleted_at,
        task.reminder_at,
        task.notification_id,
        task.start_notification_id,
        task.due_notification_id
      );

      await HistoryRepository.record(db, {
        task_id: task.id,
        action: 'created',
        details: `Task "${task.title}" created with time period`,
        snapshot_json: JSON.stringify(task),
        occurred_at: now,
      });
    });

    return task;
  }

  /**
   * Updates an existing task and reschedules reminders in a transaction.
   */
  static async update(
    db: SQLiteDatabase,
    id: string,
    updates: UpdateTaskInput
  ): Promise<Task | null> {
    const existing = await this.getById(db, id);
    if (!existing) return null;

    const now = toIsoString();
    const newStartAt = updates.start_at !== undefined ? updates.start_at : existing.start_at;
    const newDueAt = updates.due_at !== undefined ? updates.due_at : existing.due_at;
    const newTitle = updates.title !== undefined ? updates.title.trim() : existing.title;
    const newStatus = updates.status ?? existing.status;

    // Reschedule notifications if time, title, or status changed
    const reminders = await ReminderService.scheduleTaskReminders({
      id,
      title: newTitle,
      start_at: newStartAt,
      due_at: newDueAt,
      status: newStatus,
      existingStartNotificationId: existing.start_notification_id,
      existingDueNotificationId: existing.due_notification_id,
    });

    let updatedResult: Task | null = null;

    await db.withTransactionAsync(async () => {
      const changes: string[] = [];

      const updatedTask: Task = {
        ...existing,
        title: newTitle,
        description:
          updates.description !== undefined
            ? updates.description?.trim() || null
            : existing.description,
        priority: updates.priority ?? existing.priority,
        category: updates.category !== undefined ? updates.category : existing.category,
        status: newStatus,
        start_at: newStartAt,
        due_at: newDueAt,
        reminder_at:
          updates.reminder_at !== undefined ? updates.reminder_at : existing.reminder_at,
        notification_id:
          reminders.startNotificationId || reminders.dueNotificationId || existing.notification_id,
        start_notification_id: reminders.startNotificationId,
        due_notification_id: reminders.dueNotificationId,
        updated_at: now,
      };

      if (newTitle !== existing.title) {
        changes.push(`title changed to "${newTitle}"`);
      }
      if (updates.priority && updates.priority !== existing.priority) {
        changes.push(`priority changed to ${updatedTask.priority}`);
      }
      if (newStartAt !== existing.start_at || newDueAt !== existing.due_at) {
        changes.push('time period changed');
      }

      await db.runAsync(
        `UPDATE tasks SET
          title = ?,
          description = ?,
          priority = ?,
          category = ?,
          status = ?,
          start_at = ?,
          due_at = ?,
          updated_at = ?,
          reminder_at = ?,
          notification_id = ?,
          start_notification_id = ?,
          due_notification_id = ?
        WHERE id = ?;`,
        updatedTask.title,
        updatedTask.description,
        updatedTask.priority,
        updatedTask.category,
        updatedTask.status,
        updatedTask.start_at,
        updatedTask.due_at,
        updatedTask.updated_at,
        updatedTask.reminder_at,
        updatedTask.notification_id,
        updatedTask.start_notification_id,
        updatedTask.due_notification_id,
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
   * Marks a task as complete and cancels scheduled notifications.
   */
  static async complete(db: SQLiteDatabase, id: string): Promise<Task | null> {
    const existing = await this.getById(db, id);
    if (!existing) return null;

    // Cancel scheduled notifications for completed tasks
    await ReminderService.cancelReminders([
      existing.start_notification_id,
      existing.due_notification_id,
      existing.notification_id,
    ]);

    let completedResult: Task | null = null;
    const now = toIsoString();

    await db.withTransactionAsync(async () => {
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
        details: `Task "${existing.title}" completed`,
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
   * Reopens a completed task and reschedules reminders if times are still in the future.
   */
  static async reopen(db: SQLiteDatabase, id: string): Promise<Task | null> {
    const existing = await this.getById(db, id);
    if (!existing) return null;

    const reminders = await ReminderService.scheduleTaskReminders({
      id: existing.id,
      title: existing.title,
      start_at: existing.start_at,
      due_at: existing.due_at,
      status: 'pending',
    });

    let reopenedResult: Task | null = null;
    const now = toIsoString();

    await db.withTransactionAsync(async () => {
      await db.runAsync(
        `UPDATE tasks SET
          status = 'pending',
          completed_at = NULL,
          updated_at = ?,
          start_notification_id = ?,
          due_notification_id = ?
        WHERE id = ?;`,
        now,
        reminders.startNotificationId,
        reminders.dueNotificationId,
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
        start_notification_id: reminders.startNotificationId,
        due_notification_id: reminders.dueNotificationId,
      };
    });

    return reopenedResult;
  }

  /**
   * Soft-deletes a task and cancels its notifications.
   */
  static async delete(db: SQLiteDatabase, id: string): Promise<boolean> {
    const existing = await this.getById(db, id);
    if (!existing) return false;

    await ReminderService.cancelReminders([
      existing.start_notification_id,
      existing.due_notification_id,
      existing.notification_id,
    ]);

    let deletedSuccess = false;
    const now = toIsoString();

    await db.withTransactionAsync(async () => {
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
    const existing = await this.getById(db, id);
    if (!existing) return false;

    let restoredSuccess = false;
    const now = toIsoString();

    await db.withTransactionAsync(async () => {
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
