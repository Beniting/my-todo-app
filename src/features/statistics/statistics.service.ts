import type { SQLiteDatabase } from 'expo-sqlite';
import { toDateOnlyString, toIsoString } from '@/utils/date';

export interface DashboardStatistics {
  totalTasks: number;
  pendingTasks: number;
  completedTasks: number;
  completedToday: number;
  overdueTasks: number;
  completionRate: number; // 0 to 100 percentage
  priorityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
  categoryBreakdown: Record<string, number>;
  weeklyTrend: { date: string; dayLabel: string; count: number }[];
}

export class StatisticsService {
  static async getDashboardStats(db: SQLiteDatabase): Promise<DashboardStatistics> {
    const today = toDateOnlyString();
    const nowIso = toIsoString();

    // 1. Core counts
    const countsResult = await db.getFirstAsync<{
      total: number;
      pending: number;
      completed: number;
      completed_today: number;
      overdue: number;
      high_prio: number;
      med_prio: number;
      low_prio: number;
    }>(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'completed' AND completed_at LIKE ? THEN 1 ELSE 0 END) as completed_today,
        SUM(CASE WHEN status = 'pending' AND due_at IS NOT NULL AND due_at < ? THEN 1 ELSE 0 END) as overdue,
        SUM(CASE WHEN status = 'pending' AND priority = 'high' THEN 1 ELSE 0 END) as high_prio,
        SUM(CASE WHEN status = 'pending' AND priority = 'medium' THEN 1 ELSE 0 END) as med_prio,
        SUM(CASE WHEN status = 'pending' AND priority = 'low' THEN 1 ELSE 0 END) as low_prio
      FROM tasks
      WHERE deleted_at IS NULL;`,
      `${today}%`,
      nowIso
    );

    const total = countsResult?.total ?? 0;
    const completed = countsResult?.completed ?? 0;
    const pending = countsResult?.pending ?? 0;
    const completedToday = countsResult?.completed_today ?? 0;
    const overdue = countsResult?.overdue ?? 0;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    // 2. Category breakdown
    const categoryRows = await db.getAllAsync<{ category: string | null; count: number }>(
      `SELECT category, COUNT(*) as count
       FROM tasks
       WHERE deleted_at IS NULL AND status = 'pending'
       GROUP BY category;`
    );

    const categoryBreakdown: Record<string, number> = {};
    for (const row of categoryRows) {
      const key = row.category || 'General';
      categoryBreakdown[key] = row.count;
    }

    // 3. Weekly trend (last 7 days of completed tasks from task_history)
    const days: { date: string; dayLabel: string; count: number }[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = toDateOnlyString(d);
      const dayLabel = dayNames[d.getDay()];

      const dayResult = await db.getFirstAsync<{ count: number }>(
        `SELECT COUNT(*) as count
         FROM task_history
         WHERE action = 'completed' AND occurred_at LIKE ?;`,
        `${dateStr}%`
      );

      days.push({
        date: dateStr,
        dayLabel: i === 0 ? 'Today' : dayLabel,
        count: dayResult?.count ?? 0,
      });
    }

    return {
      totalTasks: total,
      pendingTasks: pending,
      completedTasks: completed,
      completedToday,
      overdueTasks: overdue,
      completionRate,
      priorityBreakdown: {
        high: countsResult?.high_prio ?? 0,
        medium: countsResult?.med_prio ?? 0,
        low: countsResult?.low_prio ?? 0,
      },
      categoryBreakdown,
      weeklyTrend: days,
    };
  }
}
