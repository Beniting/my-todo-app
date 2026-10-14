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
import { toDateOnlyString } from '@/utils/date';

export default function CalendarScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { tasks, toggleTask, deleteTask } = useTodo();

  const [selectedDate, setSelectedDate] = useState<string>(toDateOnlyString());

  // Generate 14 days around today (-3 days to +10 days)
  const days: { dateStr: string; dayNum: number; dayLabel: string; isToday: boolean }[] = [];
  const todayStr = toDateOnlyString();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = -3; i <= 10; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const dateStr = toDateOnlyString(d);
    days.push({
      dateStr,
      dayNum: d.getDate(),
      dayLabel: dayNames[d.getDay()],
      isToday: dateStr === todayStr,
    });
  }

  // Filter tasks due on selectedDate
  const dayTasks = tasks.filter((t) => t.due_at && t.due_at.startsWith(selectedDate));
  const completedCount = dayTasks.filter((t) => t.status === 'completed').length;
  const pendingCount = dayTasks.filter((t) => t.status === 'pending').length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}>
      {/* Date Strip */}
      <View
        style={[
          styles.stripContainer,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderBottomColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stripContent}>
          {days.map((item) => {
            const isSelected = selectedDate === item.dateStr;
            const hasTasks = tasks.some(
              (t) => t.due_at && t.due_at.startsWith(item.dateStr) && t.status === 'pending'
            );

            return (
              <TouchableOpacity
                key={item.dateStr}
                activeOpacity={0.8}
                onPress={() => setSelectedDate(item.dateStr)}
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
      </View>

      {/* Selected Day Info */}
      <View style={styles.dayHeader}>
        <View>
          <Text style={[styles.dateTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {selectedDate === todayStr ? 'Today' : selectedDate}
          </Text>
          <Text style={[styles.dateSubtitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {pendingCount} pending, {completedCount} completed
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/tasks/new')}
          style={styles.addDayBtn}>
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addDayBtnText}>Add</Text>
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
            subtitle="Plan ahead by scheduling a task for this date."
            actionLabel="+ Schedule Task"
            onAction={() => router.push('/tasks/new')}
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
  stripContainer: {
    borderBottomWidth: 1,
    paddingVertical: 12,
  },
  stripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  dayCard: {
    width: 52,
    height: 70,
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
    fontSize: 13,
  },
  addDayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  addDayBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
});
