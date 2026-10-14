import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { StatCard } from '@/components/StatCard';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { LoadingState } from '@/components/LoadingState';
import { isToday } from '@/utils/date';

export default function DashboardScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { stats, tasks, isLoading, refreshStats, refreshTasks, toggleTask, deleteTask } =
    useTodo();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshTasks()]);
    setRefreshing(false);
  }, [refreshStats, refreshTasks]);

  if (isLoading && !stats) {
    return <LoadingState message="Loading your dashboard..." />;
  }

  // Today's pending or high priority tasks
  const todayTasks = tasks.filter((t) => t.status === 'pending' && (isToday(t.due_at) || t.priority === 'high'));
  const pendingCount = stats?.pendingTasks ?? 0;
  const completedToday = stats?.completedToday ?? 0;
  const overdueCount = stats?.overdueTasks ?? 0;
  const completionRate = stats?.completionRate ?? 0;

  const todayDateFormatted = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }>
      {/* Header Greeting */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.dateText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            {todayDateFormatted}
          </Text>
          <Text style={[styles.greeting, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            My To-Do
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.push('/tasks/new')}
          style={styles.addButton}>
          <Ionicons name="add" size={24} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Metric Cards Grid */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Pending Tasks"
          value={pendingCount}
          icon="time-outline"
          color="#3B82F6"
        />
        <StatCard
          label="Done Today"
          value={completedToday}
          icon="checkmark-done-circle-outline"
          color="#10B981"
        />
        <StatCard
          label="Overdue"
          value={overdueCount}
          icon="alert-circle-outline"
          color="#EF4444"
          subtext={overdueCount > 0 ? 'Requires attention' : 'All caught up!'}
        />
        <StatCard
          label="Completion"
          value={`${completionRate}%`}
          icon="pie-chart-outline"
          color="#8B5CF6"
          subtext={`${stats?.completedTasks ?? 0} of ${stats?.totalTasks ?? 0} total`}
        />
      </View>

      {/* Weekly Progress Bar */}
      {stats?.weeklyTrend && stats.weeklyTrend.length > 0 && (
        <View
          style={[
            styles.card,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
            },
          ]}>
          <View style={styles.sectionHeader}>
            <Text
              style={[
                styles.sectionTitle,
                { color: isDark ? '#FFFFFF' : '#111827' },
              ]}>
              7-Day Activity
            </Text>
            <Text
              style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Tasks Completed
            </Text>
          </View>

          <View style={styles.trendRow}>
            {stats.weeklyTrend.map((day) => {
              const maxCount = Math.max(...stats.weeklyTrend.map((d) => d.count), 1);
              const heightPercent = Math.max(12, Math.round((day.count / maxCount) * 60));
              return (
                <View key={day.date} style={styles.trendBarCol}>
                  <Text
                    style={[
                      styles.trendCount,
                      { color: isDark ? '#9CA3AF' : '#6B7280' },
                    ]}>
                    {day.count > 0 ? day.count : ''}
                  </Text>
                  <View style={styles.barTrack}>
                    <View
                      style={[
                        styles.barFill,
                        {
                          height: heightPercent,
                          backgroundColor:
                            day.dayLabel === 'Today' ? '#2563EB' : '#93C5FD',
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.trendLabel,
                      {
                        color:
                          day.dayLabel === 'Today'
                            ? '#2563EB'
                            : isDark
                            ? '#9CA3AF'
                            : '#6B7280',
                        fontWeight: day.dayLabel === 'Today' ? '700' : '400',
                      },
                    ]}>
                    {day.dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Today's Focus Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text
            style={[
              styles.sectionTitle,
              { color: isDark ? '#FFFFFF' : '#111827' },
            ]}>
            Today's Focus ({todayTasks.length})
          </Text>
          <TouchableOpacity onPress={() => router.push('/tasks')}>
            <Text style={styles.seeAllText}>View All Tasks</Text>
          </TouchableOpacity>
        </View>

        {todayTasks.length === 0 ? (
          <EmptyState
            icon="checkmark-circle-outline"
            title="All clear for today!"
            subtitle="You have no urgent or due tasks scheduled for today. Great job or plan ahead."
            actionLabel="+ Create a Task"
            onAction={() => router.push('/tasks/new')}
          />
        ) : (
          todayTasks.map((t) => (
            <TaskCard
              key={t.id}
              task={t}
              onToggle={toggleTask}
              onDelete={deleteTask}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 18,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  dateText: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  greeting: {
    fontSize: 26,
    fontWeight: '800',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 4,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAllText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '600',
  },
  trendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    height: 90,
    paddingTop: 8,
  },
  trendBarCol: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  trendCount: {
    fontSize: 11,
    fontWeight: '600',
    height: 14,
  },
  barTrack: {
    height: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
    width: '100%',
  },
  barFill: {
    width: 14,
    borderRadius: 6,
  },
  trendLabel: {
    fontSize: 11,
  },
});
