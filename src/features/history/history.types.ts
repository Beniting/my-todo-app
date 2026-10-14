export type HistoryAction =
  | 'created'
  | 'updated'
  | 'completed'
  | 'reopened'
  | 'deleted'
  | 'reminder_changed';

export interface TaskHistoryEntry {
  id: string;
  task_id: string;
  action: HistoryAction;
  details: string | null;
  occurred_at: string;
  snapshot_json: string | null;
  // Optional join field for UI convenience
  task_title?: string;
}

export interface CreateHistoryInput {
  task_id: string;
  action: HistoryAction;
  details?: string | null;
  snapshot_json?: string | null;
  occurred_at?: string;
}
