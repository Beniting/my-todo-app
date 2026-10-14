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
 * Formats time portion (e.g. "8:00 AM" or "10:30 PM")
 */
export function formatTime(isoString?: string | null): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Formats a start and due time into a clean range (e.g. "8:00 AM – 10:00 AM")
 */
export function formatTimeRange(startIso?: string | null, dueIso?: string | null): string {
  const start = formatTime(startIso);
  const due = formatTime(dueIso);

  if (start && due) return `${start} – ${due}`;
  if (start) return `Starts ${start}`;
  if (due) return `Due ${due}`;
  return '';
}

/**
 * Calculates human duration between two ISO strings (e.g. "2h", "1h 30m", "45m")
 */
export function calculateDuration(startIso?: string | null, dueIso?: string | null): string {
  if (!startIso || !dueIso) return '';
  const start = new Date(startIso).getTime();
  const due = new Date(dueIso).getTime();
  if (isNaN(start) || isNaN(due) || due <= start) return '';

  const diffMinutes = Math.round((due - start) / (1000 * 60));
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;

  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${mins} min${mins > 1 ? 's' : ''}`;
}

/**
 * Checks if the current time falls within the scheduled slot
 */
export function isCurrentlyActive(startIso?: string | null, dueIso?: string | null): boolean {
  if (!startIso || !dueIso) return false;
  const now = Date.now();
  const start = new Date(startIso).getTime();
  const due = new Date(dueIso).getTime();
  return now >= start && now <= due;
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
    const timePart = formatTime(isoString);
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

export interface MonthGridDay {
  dateStr: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
}

/**
 * Generates calendar weeks matrix for any given month/year
 */
export function getMonthMatrix(year: number, month: number): MonthGridDay[][] {
  const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const todayStr = toDateOnlyString();

  const matrix: MonthGridDay[][] = [];
  let currentWeek: MonthGridDay[] = [];

  // Previous month trailing days
  for (let i = firstDayIndex - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevDate = new Date(year, month - 1, day);
    const dateStr = toDateOnlyString(prevDate);
    currentWeek.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: false,
      isToday: dateStr === todayStr,
    });
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const curDate = new Date(year, month, day);
    const dateStr = toDateOnlyString(curDate);
    currentWeek.push({
      dateStr,
      dayNumber: day,
      isCurrentMonth: true,
      isToday: dateStr === todayStr,
    });

    if (currentWeek.length === 7) {
      matrix.push(currentWeek);
      currentWeek = [];
    }
  }

  // Next month leading days to complete week
  if (currentWeek.length > 0) {
    let nextDay = 1;
    while (currentWeek.length < 7) {
      const nextDate = new Date(year, month + 1, nextDay);
      const dateStr = toDateOnlyString(nextDate);
      currentWeek.push({
        dateStr,
        dayNumber: nextDay,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
      });
      nextDay++;
    }
    matrix.push(currentWeek);
  }

  return matrix;
}
