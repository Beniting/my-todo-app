export type Priority = 'low' | 'medium' | 'high';
export type TaskStatus = 'pending' | 'completed';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  priority: Priority;
  category: string | null;
  status: TaskStatus;
  start_at: string | null; // Scheduled start time of task period (e.g. 8:00 AM)
  due_at: string | null;   // Scheduled end/due time of task period (e.g. 10:00 AM)
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  reminder_at: string | null;
  notification_id: string | null;
  start_notification_id: string | null;
  due_notification_id: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: Priority;
  category?: string | null;
  start_at?: string | null;
  due_at?: string | null;
  reminder_at?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string | null;
  priority?: Priority;
  category?: string | null;
  status?: TaskStatus;
  start_at?: string | null;
  due_at?: string | null;
  reminder_at?: string | null;
  notification_id?: string | null;
  start_notification_id?: string | null;
  due_notification_id?: string | null;
}

export interface TaskFilterOptions {
  searchQuery?: string;
  status?: TaskStatus | 'all';
  priority?: Priority | 'all';
  category?: string | 'all';
  overdueOnly?: boolean;
  dueTodayOnly?: boolean;
  includeDeleted?: boolean;
}

export type TaskSortField = 'due_at' | 'start_at' | 'priority' | 'created_at' | 'title';
export type TaskSortDirection = 'asc' | 'desc';

export interface TaskSortOptions {
  field: TaskSortField;
  direction: TaskSortDirection;
}

export const PRESET_CATEGORIES = [
  'Work',
  'Personal',
  'Study',
  'Health',
  'Shopping',
  'Finance',
  'General',
] as const;

export type PresetCategory = (typeof PRESET_CATEGORIES)[number];
