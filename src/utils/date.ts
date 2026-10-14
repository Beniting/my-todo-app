/**
 * Date and time utility helpers for 'My To-Do'
 * Enforces ISO 8601 UTC string storage and reliable local display.
 */

export function toIsoString(date: Date = new Date()): string {
  return date.toISOString();
}

/**
 * Returns YYYY-MM-DD for date comparison
 */
export function toDateOnlyString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Check if a given ISO date is today in local time
 */
export function isToday(isoString?: string | null): boolean {
  if (!isoString) return false;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return false;
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
}

/**
 * Check if an ISO date is in the past (overdue) compared to current local time
 */
export function isOverdue(isoString?: string | null, status?: string): boolean {
  if (!isoString || status === 'completed') return false;
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
}

/**
 * Formats date into human friendly string (e.g., "Today", "Tomorrow", "Oct 15, 2026")
 */
export function formatDisplayDate(isoString?: string | null, includeTime: boolean = false): string {
  if (!isoString) return 'No date';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return 'Invalid date';

  const today = new Date();
  const todayDateOnly = toDateOnlyString(today);
  const targetDateOnly = toDateOnlyString(date);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDateOnly = toDateOnlyString(tomorrow);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayDateOnly = toDateOnlyString(yesterday);

  let datePart = '';
  if (targetDateOnly === todayDateOnly) {
    datePart = 'Today';
  } else if (targetDateOnly === tomorrowDateOnly) {
    datePart = 'Tomorrow';
  } else if (targetDateOnly === yesterdayDateOnly) {
    datePart = 'Yesterday';
  } else {
    datePart = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined,
    });
  }

  if (includeTime) {
    const timePart = date.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${datePart} at ${timePart}`;
  }

  return datePart;
}

/**
 * Format relative time for history logs (e.g. "Just now", "5m ago", "2h ago", "Yesterday")
 */
export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 30) return 'Just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Returns the last N days as YYYY-MM-DD strings for trends
 */
export function getLastNDays(n: number = 7): string[] {
  const days: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(toDateOnlyString(d));
  }
  return days;
}
