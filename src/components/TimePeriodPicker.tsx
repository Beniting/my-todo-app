import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  toDateOnlyString,
  toIsoString,
  formatTime,
  calculateDuration,
  getMonthMatrix,
} from '@/utils/date';
import { ReminderService } from '@/features/reminders/reminder.service';

interface TimePeriodPickerProps {
  initialDate?: string | null;
  initialStartAt?: string | null;
  initialDueAt?: string | null;
  onChange: (period: {
    start_at: string | null;
    due_at: string | null;
    date: string;
    hasTimePeriod: boolean;
  }) => void;
}

function to24Hour(hour: number, period: 'AM' | 'PM'): number {
  if (period === 'AM') return hour === 12 ? 0 : hour;
  return hour === 12 ? 12 : hour + 12;
}

export function TimePeriodPicker({
  initialDate,
  initialStartAt,
  initialDueAt,
  onChange,
}: TimePeriodPickerProps) {
  const isDark = useColorScheme() === 'dark';

  // Date selection state
  const initialDateStr = (() => {
    if (initialDate && initialDate.length >= 10) return initialDate.slice(0, 10);
    if (initialStartAt && initialStartAt.length >= 10) return initialStartAt.slice(0, 10);
    if (initialDueAt && initialDueAt.length >= 10) return initialDueAt.slice(0, 10);
    return toDateOnlyString();
  })();

  const [selectedDate, setSelectedDate] = useState<string>(initialDateStr);
  const [showCalendarGrid, setShowCalendarGrid] = useState(Boolean(initialDate && initialDate !== toDateOnlyString()));
  const [hasTimePeriod, setHasTimePeriod] = useState(true);

  // Month navigation for visual calendar picker
  const [calYear, setCalYear] = useState(() => Number(initialDateStr.slice(0, 4)) || new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => (Number(initialDateStr.slice(5, 7)) || (new Date().getMonth() + 1)) - 1);

  // Time selections: parse initialStartAt/initialDueAt if present, else 8:00 AM to 10:00 AM
  const parsedStart = (() => {
    if (!initialStartAt) return { h: 8, m: 0, p: 'AM' as const };
    const d = new Date(initialStartAt);
    if (isNaN(d.getTime())) return { h: 8, m: 0, p: 'AM' as const };
    const rawH = d.getHours();
    return {
      h: rawH % 12 || 12,
      m: d.getMinutes(),
      p: rawH >= 12 ? ('PM' as const) : ('AM' as const),
    };
  })();

  const parsedEnd = (() => {
    if (!initialDueAt) return { h: 10, m: 0, p: 'AM' as const };
    const d = new Date(initialDueAt);
    if (isNaN(d.getTime())) return { h: 10, m: 0, p: 'AM' as const };
    const rawH = d.getHours();
    return {
      h: rawH % 12 || 12,
      m: d.getMinutes(),
      p: rawH >= 12 ? ('PM' as const) : ('AM' as const),
    };
  })();

  const [startHour, setStartHour] = useState(parsedStart.h);
  const [startMinute, setStartMinute] = useState(parsedStart.m);
  const [startPeriod, setStartPeriod] = useState<'AM' | 'PM'>(parsedStart.p);

  const [endHour, setEndHour] = useState(parsedEnd.h);
  const [endMinute, setEndMinute] = useState(parsedEnd.m);
  const [endPeriod, setEndPeriod] = useState<'AM' | 'PM'>(parsedEnd.p);

  // Track if initialDate changed externally (e.g. navigation params from calendar)
  const [prevInitialDate, setPrevInitialDate] = useState(initialDate);
  if (initialDate !== prevInitialDate) {
    setPrevInitialDate(initialDate);
    if (initialDate && initialDate.length >= 10) {
      const formatted = initialDate.slice(0, 10);
      setSelectedDate(formatted);
      setCalYear(Number(formatted.slice(0, 4)));
      setCalMonth(Number(formatted.slice(5, 7)) - 1);
    }
  }

  const lastEmittedRef = useRef<string>('');

  useEffect(() => {
    const [y, m, dayNum] = selectedDate.split('-').map(Number);
    const d = new Date(y, m - 1, dayNum);

    let start_at: string | null = null;
    let due_at: string | null = null;

    if (!hasTimePeriod) {
      d.setHours(23, 59, 59, 999);
      due_at = toIsoString(d);
    } else {
      const startDate = new Date(y, m - 1, dayNum);
      startDate.setHours(to24Hour(startHour, startPeriod), startMinute, 0, 0);

      const endDate = new Date(y, m - 1, dayNum);
      endDate.setHours(to24Hour(endHour, endPeriod), endMinute, 0, 0);

      if (endDate.getTime() <= startDate.getTime()) {
        endDate.setDate(endDate.getDate() + 1);
      }

      start_at = toIsoString(startDate);
      due_at = toIsoString(endDate);
    }

    const key = `${selectedDate}_${start_at}_${due_at}_${hasTimePeriod}`;
    if (lastEmittedRef.current === key) {
      return;
    }
    lastEmittedRef.current = key;

    onChange({
      start_at,
      due_at,
      date: selectedDate,
      hasTimePeriod,
    });
  }, [
    selectedDate,
    hasTimePeriod,
    startHour,
    startMinute,
    startPeriod,
    endHour,
    endMinute,
    endPeriod,
    onChange,
  ]);

  const todayStr = toDateOnlyString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toDateOnlyString(tomorrow);

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear((prev) => prev - 1);
    } else {
      setCalMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear((prev) => prev + 1);
    } else {
      setCalMonth((prev) => prev + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const monthMatrix = getMonthMatrix(calYear, calMonth);

  const applyPreset = (
    sH: number,
    sM: number,
    sP: 'AM' | 'PM',
    eH: number,
    eM: number,
    eP: 'AM' | 'PM'
  ) => {
    setHasTimePeriod(true);
    setStartHour(sH);
    setStartMinute(sM);
    setStartPeriod(sP);
    setEndHour(eH);
    setEndMinute(eM);
    setEndPeriod(eP);
  };

  const isPresetActive = (sH: number, sP: 'AM' | 'PM', eH: number, eP: 'AM' | 'PM') => {
    return (
      hasTimePeriod &&
      startHour === sH &&
      startPeriod === sP &&
      endHour === eH &&
      endPeriod === eP
    );
  };

  const [y, m, dayNum] = selectedDate.split('-').map(Number);
  const currentStartDate = new Date(y, m - 1, dayNum);
  currentStartDate.setHours(to24Hour(startHour, startPeriod), startMinute, 0, 0);
  const currentEndDate = new Date(y, m - 1, dayNum);
  currentEndDate.setHours(to24Hour(endHour, endPeriod), endMinute, 0, 0);
  if (currentEndDate.getTime() <= currentStartDate.getTime()) {
    currentEndDate.setDate(currentEndDate.getDate() + 1);
  }

  const durationStr = calculateDuration(
    toIsoString(currentStartDate),
    toIsoString(currentEndDate)
  );

  const selectedDateFormatted = new Date(y, m - 1, dayNum).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
        },
      ]}>
      {/* Header with time period toggle */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Ionicons name="calendar" size={20} color="#2563EB" />
          <Text style={[styles.headerTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            Date & Scheduled Time
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => setHasTimePeriod(!hasTimePeriod)}
          style={[
            styles.toggleBtn,
            { backgroundColor: hasTimePeriod ? '#2563EB' : isDark ? '#2C2C2E' : '#E5E7EB' },
          ]}>
          <Text
            style={[
              styles.toggleBtnText,
              { color: hasTimePeriod ? '#FFFFFF' : isDark ? '#9CA3AF' : '#4B5563' },
            ]}>
            {hasTimePeriod ? 'Specific Time' : 'All Day'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Date Shortcuts & Visual Calendar Picker */}
      <View style={styles.sectionRow}>
        <View style={styles.dateLabelRow}>
          <Text style={[styles.subLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Selected Date: <Text style={{ color: '#2563EB', fontWeight: '800' }}>{selectedDateFormatted}</Text>
          </Text>
        </View>

        {/* Quick Date Chips */}
        <View style={styles.pillsRow}>
          <TouchableOpacity
            onPress={() => setSelectedDate(todayStr)}
            style={[
              styles.pill,
              selectedDate === todayStr && styles.pillActive,
              {
                backgroundColor:
                  selectedDate === todayStr
                    ? '#2563EB'
                    : isDark
                    ? '#2C2C2E'
                    : '#F3F4F6',
              },
            ]}>
            <Text
              style={[
                styles.pillText,
                selectedDate === todayStr && styles.pillTextActive,
                { color: selectedDate === todayStr ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563' },
              ]}>
              Today
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setSelectedDate(tomorrowStr)}
            style={[
              styles.pill,
              selectedDate === tomorrowStr && styles.pillActive,
              {
                backgroundColor:
                  selectedDate === tomorrowStr
                    ? '#2563EB'
                    : isDark
                    ? '#2C2C2E'
                    : '#F3F4F6',
              },
            ]}>
            <Text
              style={[
                styles.pillText,
                selectedDate === tomorrowStr && styles.pillTextActive,
                { color: selectedDate === tomorrowStr ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563' },
              ]}>
              Tomorrow
            </Text>
          </TouchableOpacity>

          {selectedDate !== todayStr && selectedDate !== tomorrowStr && (
            <TouchableOpacity
              onPress={() => setShowCalendarGrid(true)}
              style={[styles.pill, styles.pillActive, { backgroundColor: '#2563EB' }]}>
              <Ionicons name="calendar" size={13} color="#FFFFFF" />
              <Text style={[styles.pillText, styles.pillTextActive, { color: '#FFFFFF' }]}>
                {selectedDate}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={() => setShowCalendarGrid(!showCalendarGrid)}
            style={[
              styles.pill,
              showCalendarGrid && styles.pillActive,
              {
                backgroundColor: showCalendarGrid
                  ? '#2563EB'
                  : isDark
                  ? '#2C2C2E'
                  : '#F3F4F6',
              },
            ]}>
            <Ionicons
              name={showCalendarGrid ? 'close-circle-outline' : 'calendar-outline'}
              size={13}
              color={showCalendarGrid ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563'}
            />
            <Text
              style={[
                styles.pillText,
                showCalendarGrid && styles.pillTextActive,
                { color: showCalendarGrid ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563' },
              ]}>
              {showCalendarGrid ? 'Hide Calendar' : 'Calendar ▾'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expandable Interactive Month Calendar */}
        {showCalendarGrid && (
          <View
            style={[
              styles.calendarCard,
              {
                backgroundColor: isDark ? '#222326' : '#F8FAFC',
                borderColor: isDark ? '#2E3035' : '#E2E8F0',
              },
            ]}>
            {/* Month Navigator Header */}
            <View style={styles.calNavRow}>
              <TouchableOpacity onPress={handlePrevMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-back" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
              <View style={styles.calNavCenter}>
                <Text style={[styles.calMonthTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                  {monthNames[calMonth]} {calYear}
                </Text>
                {(calMonth !== new Date().getMonth() || calYear !== new Date().getFullYear()) && (
                  <TouchableOpacity
                    onPress={() => {
                      const now = new Date();
                      setSelectedDate(todayStr);
                      setCalYear(now.getFullYear());
                      setCalMonth(now.getMonth());
                    }}
                    style={styles.calTodayBtn}>
                    <Text style={styles.calTodayBtnText}>Today</Text>
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity onPress={handleNextMonth} style={styles.calNavBtn}>
                <Ionicons name="chevron-forward" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
              </TouchableOpacity>
            </View>

            {/* Day of Week Header */}
            <View style={styles.calWeekHeaderRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, i) => (
                <Text key={i} style={[styles.calWeekDayText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                  {d}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.calGrid}>
              {monthMatrix.map((week, wIdx) => (
                <View key={wIdx} style={styles.calWeekRow}>
                  {week.map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    return (
                      <TouchableOpacity
                        key={item.dateStr}
                        onPress={() => {
                          setSelectedDate(item.dateStr);
                          const [y, m] = item.dateStr.split('-').map(Number);
                          setCalYear(y);
                          setCalMonth(m - 1);
                        }}
                        style={[
                          styles.calDayBtn,
                          isSelected && styles.calDayBtnSelected,
                          item.isToday && !isSelected && styles.calDayBtnToday,
                        ]}>
                        <Text
                          style={[
                            styles.calDayText,
                            {
                              color: isSelected
                                ? '#FFFFFF'
                                : !item.isCurrentMonth
                                ? isDark
                                  ? '#4B5563'
                                  : '#CBD5E1'
                                : isDark
                                ? '#F3F4F6'
                                : '#1E293B',
                              fontWeight: isSelected ? '800' : item.isToday ? '700' : '500',
                            },
                          ]}>
                          {item.dayNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        )}
      </View>

      {hasTimePeriod ? (
        <>
          {/* Preset Time Blocks */}
          <View style={styles.sectionRow}>
            <Text style={[styles.subLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Popular Time Blocks
            </Text>
            <View style={styles.pillsRow}>
              {(
                [
                  { label: '8:00 AM – 10:00 AM', sH: 8, sM: 0, sP: 'AM', eH: 10, eM: 0, eP: 'AM' },
                  { label: '10:00 AM – 12:00 PM', sH: 10, sM: 0, sP: 'AM', eH: 12, eM: 0, eP: 'PM' },
                  { label: '2:00 PM – 4:00 PM', sH: 2, sM: 0, sP: 'PM', eH: 4, eM: 0, eP: 'PM' },
                  { label: '6:00 PM – 8:00 PM', sH: 6, sM: 0, sP: 'PM', eH: 8, eM: 0, eP: 'PM' },
                ] as const
              ).map((p, idx) => {
                const active = isPresetActive(p.sH, p.sP, p.eH, p.eP);
                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => applyPreset(p.sH, p.sM, p.sP, p.eH, p.eM, p.eP)}
                    style={[
                      styles.presetPill,
                      active && styles.presetPillActive,
                      {
                        backgroundColor: active
                          ? '#2563EB15'
                          : isDark
                          ? '#2C2C2E'
                          : '#F3F4F6',
                        borderColor: active ? '#2563EB' : 'transparent',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.presetPillText,
                        { color: active ? '#2563EB' : isDark ? '#D1D5DB' : '#4B5563' },
                        active && { fontWeight: '700' },
                      ]}>
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Interactive Start and End Time Selectors */}
          <View style={styles.timeSelectGrid}>
            {/* START TIME */}
            <View
              style={[
                styles.timeBox,
                { backgroundColor: isDark ? '#252629' : '#F8FAFC' },
              ]}>
              <Text style={[styles.timeBoxLabel, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                START TIME
              </Text>
              <View style={styles.timeValueRow}>
                {/* Hour */}
                <TouchableOpacity
                  onPress={() => setStartHour((prev) => (prev % 12) + 1)}
                  style={styles.timeDigitBtn}>
                  <Text style={[styles.timeDigitText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {startHour}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.timeColon, { color: isDark ? '#6B7280' : '#94A3B8' }]}>:</Text>

                {/* Minute */}
                <TouchableOpacity
                  onPress={() => setStartMinute((prev) => (prev + 15) % 60)}
                  style={styles.timeDigitBtn}>
                  <Text style={[styles.timeDigitText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {String(startMinute).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>

                {/* AM/PM */}
                <TouchableOpacity
                  onPress={() => setStartPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'))}
                  style={styles.periodBadge}>
                  <Text style={styles.periodBadgeText}>{startPeriod}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>
                Tap numbers to change
              </Text>
            </View>

            {/* ARROW & DURATION */}
            <View style={styles.arrowCol}>
              <Ionicons name="arrow-forward" size={18} color="#9CA3AF" />
              {durationStr ? (
                <Text style={styles.durationBadge}>{durationStr}</Text>
              ) : null}
            </View>

            {/* END TIME */}
            <View
              style={[
                styles.timeBox,
                { backgroundColor: isDark ? '#252629' : '#F8FAFC' },
              ]}>
              <Text style={[styles.timeBoxLabel, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                DUE / END TIME
              </Text>
              <View style={styles.timeValueRow}>
                {/* Hour */}
                <TouchableOpacity
                  onPress={() => setEndHour((prev) => (prev % 12) + 1)}
                  style={styles.timeDigitBtn}>
                  <Text style={[styles.timeDigitText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {endHour}
                  </Text>
                </TouchableOpacity>

                <Text style={[styles.timeColon, { color: isDark ? '#6B7280' : '#94A3B8' }]}>:</Text>

                {/* Minute */}
                <TouchableOpacity
                  onPress={() => setEndMinute((prev) => (prev + 15) % 60)}
                  style={styles.timeDigitBtn}>
                  <Text style={[styles.timeDigitText, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    {String(endMinute).padStart(2, '0')}
                  </Text>
                </TouchableOpacity>

                {/* AM/PM */}
                <TouchableOpacity
                  onPress={() => setEndPeriod((prev) => (prev === 'AM' ? 'PM' : 'AM'))}
                  style={styles.periodBadge}>
                  <Text style={styles.periodBadgeText}>{endPeriod}</Text>
                </TouchableOpacity>
              </View>
              <Text style={{ fontSize: 10, color: '#64748B', textAlign: 'center' }}>
                Tap numbers to change
              </Text>
            </View>
          </View>

          {/* Automatic Reminder Announcement Box */}
          <View
            style={[
              styles.alertBox,
              {
                backgroundColor: isDark ? '#1E293B' : '#EFF6FF',
                borderColor: isDark ? '#3B82F640' : '#BFDBFE',
              },
            ]}>
            <Ionicons
              name={ReminderService.isSupported() ? 'notifications' : 'information-circle'}
              size={18}
              color="#2563EB"
            />
            <View style={{ flex: 1, gap: 2 }}>
              {ReminderService.isSupported() ? (
                <>
                  <Text style={[styles.alertTitle, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                    2 Scheduled Reminders Configured:
                  </Text>
                  <Text style={[styles.alertText, { color: isDark ? '#BFDBFE' : '#1E40AF' }]}>
                    • Start notification at {formatTime(toIsoString(currentStartDate))}
                  </Text>
                  <Text style={[styles.alertText, { color: isDark ? '#BFDBFE' : '#1E40AF' }]}>
                    • Approaching deadline alert 15 mins before {formatTime(toIsoString(currentEndDate))}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={[styles.alertTitle, { color: isDark ? '#93C5FD' : '#1D4ED8' }]}>
                    Session: {formatTime(toIsoString(currentStartDate))} – {formatTime(toIsoString(currentEndDate))}
                  </Text>
                  <Text style={[styles.alertText, { color: isDark ? '#BFDBFE' : '#1E40AF' }]}>
                    Expo Go note: Push notifications require a Development Build (SDK 53+). In-app schedules and active tracking are fully enabled.
                  </Text>
                </>
              )}
            </View>
          </View>
        </>
      ) : (
        <View style={styles.allDayNote}>
          <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            This task has no specific start time and is scheduled for {selectedDateFormatted}.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  toggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sectionRow: {
    gap: 8,
  },
  dateLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    gap: 4,
  },
  pillActive: {
    backgroundColor: '#2563EB',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  pillTextActive: {
    color: '#FFFFFF',
  },
  calendarCard: {
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginTop: 4,
  },
  calNavRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  calNavBtn: {
    padding: 6,
    borderRadius: 8,
  },
  calNavCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calMonthTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  calTodayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  calTodayBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  calWeekHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  calWeekDayText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  calGrid: {
    gap: 4,
  },
  calWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calDayBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calDayBtnSelected: {
    backgroundColor: '#2563EB',
  },
  calDayBtnToday: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  calDayText: {
    fontSize: 13,
  },
  presetPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  presetPillActive: {
    borderColor: '#2563EB',
  },
  presetPillText: {
    fontSize: 11,
    fontWeight: '500',
  },
  timeSelectGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
    marginTop: 4,
  },
  timeBox: {
    flex: 1,
    padding: 10,
    borderRadius: 14,
    alignItems: 'center',
    gap: 4,
  },
  timeBoxLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  timeValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeDigitBtn: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    backgroundColor: 'rgba(37,99,235,0.08)',
    borderRadius: 8,
  },
  timeDigitText: {
    fontSize: 20,
    fontWeight: '800',
  },
  timeColon: {
    fontSize: 20,
    fontWeight: '800',
  },
  periodBadge: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 2,
  },
  periodBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  arrowCol: {
    alignItems: 'center',
    gap: 2,
  },
  durationBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: '#2563EB',
  },
  alertBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    marginTop: 2,
  },
  alertTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  alertText: {
    fontSize: 11,
    lineHeight: 16,
  },
  allDayNote: {
    paddingVertical: 8,
  },
});
