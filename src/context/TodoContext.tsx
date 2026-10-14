import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '@/database/database';
import { Task, CreateTaskInput, UpdateTaskInput, TaskFilterOptions, TaskSortOptions } from '@/features/tasks/task.types';
import { TaskRepository } from '@/features/tasks/task.repository';
import { HistoryRepository } from '@/features/history/history.repository';
import { TaskHistoryEntry, HistoryAction } from '@/features/history/history.types';
import { DashboardStatistics, StatisticsService } from '@/features/statistics/statistics.service';

interface TodoContextValue {
  db: SQLiteDatabase | null;
  isLoading: boolean;
  error: string | null;
  tasks: Task[];
  stats: DashboardStatistics | null;
  timeline: TaskHistoryEntry[];
  filter: TaskFilterOptions;
  sort: TaskSortOptions;
  setFilter: React.Dispatch<React.SetStateAction<TaskFilterOptions>>;
  setSort: React.Dispatch<React.SetStateAction<TaskSortOptions>>;
  refreshTasks: () => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshTimeline: (action?: HistoryAction) => Promise<void>;
  createTask: (input: CreateTaskInput) => Promise<Task>;
  updateTask: (id: string, updates: UpdateTaskInput) => Promise<Task | null>;
  toggleTask: (task: Task) => Promise<Task | null>;
  deleteTask: (id: string) => Promise<boolean>;
  getTaskById: (id: string) => Promise<Task | null>;
  getTaskHistory: (taskId: string) => Promise<TaskHistoryEntry[]>;
}

const TodoContext = createContext<TodoContextValue | undefined>(undefined);

export function TodoProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<SQLiteDatabase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<DashboardStatistics | null>(null);
  const [timeline, setTimeline] = useState<TaskHistoryEntry[]>([]);

  const [filter, setFilter] = useState<TaskFilterOptions>({
    status: 'all',
    priority: 'all',
    category: 'all',
    searchQuery: '',
  });

  const [sort, setSort] = useState<TaskSortOptions>({
    field: 'created_at',
    direction: 'desc',
  });

  // Initialize SQLite DB
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        setIsLoading(true);
        const database = await getDatabase();
        if (isMounted) {
          setDb(database);
          setError(null);
        }
      } catch (err: any) {
        console.error('Database initialization failed:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to initialize database');
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const refreshTasks = useCallback(async () => {
    if (!db) return;
    try {
      const result = await TaskRepository.getTasks(db, filter, sort);
      setTasks(result);
    } catch (err) {
      console.error('Failed to fetch tasks:', err);
    }
  }, [db, filter, sort]);

  const refreshStats = useCallback(async () => {
    if (!db) return;
    try {
      const data = await StatisticsService.getDashboardStats(db);
      setStats(data);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
    }
  }, [db]);

  const refreshTimeline = useCallback(
    async (action?: HistoryAction) => {
      if (!db) return;
      try {
        const events = await HistoryRepository.getTimeline(db, { action });
        setTimeline(events);
      } catch (err) {
        console.error('Failed to fetch timeline:', err);
      }
    },
    [db]
  );

  // Sync tasks and stats whenever DB, filter, or sort changes
  useEffect(() => {
    if (db) {
      refreshTasks();
      refreshStats();
    }
  }, [db, refreshTasks, refreshStats]);

  const createTask = async (input: CreateTaskInput): Promise<Task> => {
    if (!db) throw new Error('Database not ready');
    const newTask = await TaskRepository.create(db, input);
    await Promise.all([refreshTasks(), refreshStats()]);
    return newTask;
  };

  const updateTask = async (id: string, updates: UpdateTaskInput): Promise<Task | null> => {
    if (!db) throw new Error('Database not ready');
    const updated = await TaskRepository.update(db, id, updates);
    await Promise.all([refreshTasks(), refreshStats()]);
    return updated;
  };

  const toggleTask = async (task: Task): Promise<Task | null> => {
    if (!db) throw new Error('Database not ready');
    let result: Task | null = null;
    if (task.status === 'completed') {
      result = await TaskRepository.reopen(db, task.id);
    } else {
      result = await TaskRepository.complete(db, task.id);
    }
    await Promise.all([refreshTasks(), refreshStats()]);
    return result;
  };

  const deleteTask = async (id: string): Promise<boolean> => {
    if (!db) throw new Error('Database not ready');
    const success = await TaskRepository.delete(db, id);
    await Promise.all([refreshTasks(), refreshStats()]);
    return success;
  };

  const getTaskById = async (id: string): Promise<Task | null> => {
    if (!db) return null;
    return await TaskRepository.getById(db, id);
  };

  const getTaskHistory = async (taskId: string): Promise<TaskHistoryEntry[]> => {
    if (!db) return [];
    return await HistoryRepository.getByTaskId(db, taskId);
  };

  return (
    <TodoContext.Provider
      value={{
        db,
        isLoading,
        error,
        tasks,
        stats,
        timeline,
        filter,
        sort,
        setFilter,
        setSort,
        refreshTasks,
        refreshStats,
        refreshTimeline,
        createTask,
        updateTask,
        toggleTask,
        deleteTask,
        getTaskById,
        getTaskHistory,
      }}>
      {children}
    </TodoContext.Provider>
  );
}

export function useTodo() {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodo must be used within a TodoProvider');
  }
  return context;
}
