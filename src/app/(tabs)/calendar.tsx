import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { toDateOnlyString, getMonthMatrix } from '@/utils/date';

export default function CalendarScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { tasks, toggleTask, deleteTask } = useTodo();

  const todayStr = toDateOnlyString();
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [calYear, setCalYear] = useState(() => Number(todayStr.slice(0, 4)) || new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(() => (Number(todayStr.slice(5, 7)) || (new Date().getMonth() + 1)) - 1);
  const [viewMode, setViewMode] = useState<'month' | 'strip'>('month');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

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

  const handleJumpToToday = () => {
    const now = new Date();
    setSelectedDate(todayStr);
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  };

  const handleSelectDate = (dateStr: string) => {
    setSelectedDate(dateStr);
    const [y, m] = dateStr.split('-').map(Number);
    setCalYear(y);
    setCalMonth(m - 1);
  };

  // Generate 21 days around today for strip view (-5 to +15 days)
  const stripDays: { dateStr: string; dayNum: number; dayLabel: string; isToday: boolean }[] = [];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const baseDate = new Date();
  for (let i = -5; i <= 15; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = toDateOnlyString(d);
    stripDays.push({
      dateStr,
      dayNum: d.getDate(),
      dayLabel: dayNames[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }

  const monthMatrix = getMonthMatrix(calYear, calMonth);

  // Filter tasks starting or due on selectedDate, sorted chronologically by time
  const dayTasks = tasks
    .filter(
      (t) =>
        (t.start_at && t.start_at.startsWith(selectedDate)) ||
        (t.due_at && t.due_at.startsWith(selectedDate))
    )
    .sort((a, b) => {
      const timeA = a.start_at || a.due_at || '';
      const timeB = b.start_at || b.due_at || '';
      return timeA.localeCompare(timeB);
    });

  const completedCount = dayTasks.filter((t) => t.status === 'completed').length;
  const pendingCount = dayTasks.filter((t) => t.status === 'pending').length;

  const handleAddTaskForDate = () => {
    router.push({
      pathname: '/tasks/new',
      params: { date: selectedDate },
    });
  };

  // Format selected date for header
  const [sY, sM, sD] = selectedDate.split('-').map(Number);
  const selectedObj = new Date(sY, sM - 1, sD);
  const formattedDayTitle =
    selectedDate === todayStr
      ? 'Today'
      : selectedObj.toLocaleDateString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: selectedObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
        });

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}>
      {/* Calendar Header Navigation */}
      <View
        style={[
          styles.calendarTopBar,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderBottomColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={handlePrevMonth}
            style={[styles.navArrowBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
            <Ionicons name="chevron-back" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
          </TouchableOpacity>

          <View style={styles.monthTitleWrapper}>
            <Text style={[styles.monthTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              {monthNames[calMonth]} {calYear}
            </Text>
            {(calMonth !== new Date().getMonth() || calYear !== new Date().getFullYear()) && (
              <TouchableOpacity onPress={handleJumpToToday} style={styles.todayBtn}>
                <Text style={styles.todayBtnText}>Today</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            onPress={handleNextMonth}
            style={[styles.navArrowBtn, { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' }]}>
            <Ionicons name="chevron-forward" size={18} color={isDark ? '#FFFFFF' : '#111827'} />
          </TouchableOpacity>
        </View>

        {/* View Mode Toggle: Month vs Strip */}
        <View style={styles.viewModeToggleRow}>
          <TouchableOpacity
            onPress={() => setViewMode('month')}
            style={[
              styles.viewModeBtn,
              viewMode === 'month' && styles.viewModeBtnActive,
              { backgroundColor: viewMode === 'month' ? '#2563EB' : isDark ? '#2C2C2E' : '#F3F4F6' },
            ]}>
            <Ionicons
              name="calendar"
              size={14}
              color={viewMode === 'month' ? '#FFFFFF' : isDark ? '#9CA3AF' : '#4B5563'}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                { color: viewMode === 'month' ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563' },
              ]}>
              Month View
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setViewMode('strip')}
            style={[
              styles.viewModeBtn,
              viewMode === 'strip' && styles.viewModeBtnActive,
              { backgroundColor: viewMode === 'strip' ? '#2563EB' : isDark ? '#2C2C2E' : '#F3F4F6' },
            ]}>
            <Ionicons
              name="albums-outline"
              size={14}
              color={viewMode === 'strip' ? '#FFFFFF' : isDark ? '#9CA3AF' : '#4B5563'}
            />
            <Text
              style={[
                styles.viewModeBtnText,
                { color: viewMode === 'strip' ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563' },
              ]}>
              Week Strip
            </Text>
          </TouchableOpacity>
        </View>

        {/* Month Calendar Matrix */}
        {viewMode === 'month' ? (
          <View style={styles.monthCalendarContainer}>
            {/* Weekday names */}
            <View style={styles.weekNamesRow}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w, idx) => (
                <Text
                  key={idx}
                  style={[styles.weekNameText, { color: isDark ? '#9CA3AF' : '#64748B' }]}>
                  {w}
                </Text>
              ))}
            </View>

            {/* Days Grid */}
            <View style={styles.matrixContainer}>
              {monthMatrix.map((week, wIdx) => (
                <View key={wIdx} style={styles.matrixWeekRow}>
                  {week.map((item) => {
                    const isSelected = selectedDate === item.dateStr;
                    const hasPending = tasks.some(
                      (t) =>
                        ((t.start_at && t.start_at.startsWith(item.dateStr)) ||
                          (t.due_at && t.due_at.startsWith(item.dateStr))) &&
                        t.status === 'pending'
                    );
                    const hasCompleted = tasks.some(
                      (t) =>
                        ((t.start_at && t.start_at.startsWith(item.dateStr)) ||
                          (t.due_at && t.due_at.startsWith(item.dateStr))) &&
                        t.status === 'completed'
                    );

                    return (
                      <TouchableOpacity
                        key={item.dateStr}
                        activeOpacity={0.7}
                        onPress={() => handleSelectDate(item.dateStr)}
                        style={[
                          styles.calCell,
                          isSelected && styles.calCellSelected,
                          item.isToday && !isSelected && styles.calCellToday,
                        ]}>
                        <Text
                          style={[
                            styles.calCellText,
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
                        <View style={styles.dotsRow}>
                          {hasPending && (
                            <View
                              style={[
                                styles.dayDot,
                                { backgroundColor: isSelected ? '#FFFFFF' : '#3B82F6' },
                              ]}
                            />
                          )}
                          {hasCompleted && (
                            <View
                              style={[
                                styles.dayDot,
                                { backgroundColor: isSelected ? '#A7F3D0' : '#10B981' },
                              ]}
                            />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* Horizontal Strip View */
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.stripContent}>
            {stripDays.map((item) => {
              const isSelected = selectedDate === item.dateStr;
              const hasTasks = tasks.some(
                (t) =>
                  ((t.start_at && t.start_at.startsWith(item.dateStr)) ||
                    (t.due_at && t.due_at.startsWith(item.dateStr))) &&
                  t.status === 'pending'
              );

              return (
                <TouchableOpacity
                  key={item.dateStr}
                  activeOpacity={0.8}
                  onPress={() => handleSelectDate(item.dateStr)}
                  style={[
                    styles.dayCard,
                    {
                      backgroundColor: isSelected
                        ? '#2563EB'
                        : item.isToday
                        ? isDark
                          ? '#2C2C2E'
                          : '#EFF6FF'
                        : isDark
                        ? '#1C1C1E'
                        : '#FFFFFF',
                      borderColor: isSelected
                        ? '#2563EB'
                        : item.isToday
                        ? '#3B82F6'
                        : isDark
                        ? '#2C2C2E'
                        : '#E5E7EB',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.dayLabel,
                      {
                        color: isSelected
                          ? '#DBEAFE'
                          : item.isToday
                          ? '#3B82F6'
                          : isDark
                          ? '#9CA3AF'
                          : '#6B7280',
                      },
                    ]}>
                    {item.dayLabel}
                  </Text>
                  <Text
                    style={[
                      styles.dayNum,
                      {
                        color: isSelected
                          ? '#FFFFFF'
                          : isDark
                          ? '#FFFFFF'
                          : '#111827',
                      },
                    ]}>
                    {item.dayNum}
                  </Text>
                  {hasTasks && (
                    <View
                      style={[
                        styles.taskDot,
                        { backgroundColor: isSelected ? '#FFFFFF' : '#3B82F6' },
                      ]}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Selected Day Info & Add Button */}
      <View style={styles.dayHeader}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.dateTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {formattedDayTitle}
          </Text>
          <Text style={[styles.dateSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {selectedDate} · {pendingCount} pending, {completedCount} completed
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={handleAddTaskForDate}
          style={styles.addDayBtn}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addDayBtnText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Day Tasks List */}
      <FlatList
        data={dayTasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={toggleTask}
            onDelete={deleteTask}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No tasks for this day"
            subtitle={`Plan ahead by scheduling a task for ${formattedDayTitle}.`}
            actionLabel={`+ Schedule for ${selectedDate}`}
            onAction={handleAddTaskForDate}
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  calendarTopBar: {
    borderBottomWidth: 1,
    paddingTop: 8,
    paddingBottom: 10,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  navArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  todayBtn: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: 'rgba(37, 99, 235, 0.1)',
  },
  todayBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2563EB',
  },
  viewModeToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 10,
  },
  viewModeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    gap: 6,
  },
  viewModeBtnActive: {
    backgroundColor: '#2563EB',
  },
  viewModeBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  monthCalendarContainer: {
    paddingHorizontal: 16,
  },
  weekNamesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  weekNameText: {
    width: 36,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
  },
  matrixContainer: {
    gap: 4,
  },
  matrixWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calCell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCellSelected: {
    backgroundColor: '#2563EB',
  },
  calCellToday: {
    borderWidth: 1.5,
    borderColor: '#2563EB',
  },
  calCellText: {
    fontSize: 13,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 2,
  },
  dayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  stripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayCard: {
    width: 52,
    height: 68,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  dayNum: {
    fontSize: 18,
    fontWeight: '800',
  },
  taskDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 2,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  dateSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    gap: 4,
  },
  addDayBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
