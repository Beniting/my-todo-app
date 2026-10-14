import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  useColorScheme,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { toIsoString } from '@/utils/date';

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const { db, stats, timeline, refreshTasks, refreshStats, refreshTimeline, createTask } =
    useTodo();

  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  const handleSeedData = async () => {
    Alert.alert(
      'Seed Sample Tasks',
      'This will insert a set of demo tasks with different priorities, categories, and due dates. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Seed Tasks',
          onPress: async () => {
            const today = new Date();
            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            const sampleTasks = [
              {
                title: 'Design app icon and brand assets',
                description: 'Review guidelines for Android adaptive icons and vector badges.',
                priority: 'high' as const,
                category: 'Work',
                due_at: toIsoString(today),
              },
              {
                title: 'Review weekly sprint goals and PRs',
                description: 'Check team backlog, merge bugfix branches, and update Jira tickets.',
                priority: 'medium' as const,
                category: 'Work',
                due_at: toIsoString(tomorrow),
              },
              {
                title: 'Buy fresh vegetables and groceries',
                description: 'Spinach, broccoli, olive oil, almonds, and Greek yogurt.',
                priority: 'low' as const,
                category: 'Shopping',
                due_at: toIsoString(today),
              },
              {
                title: 'Complete 30-minute cardio workout',
                description: 'Outdoor jog or 5km run followed by stretching.',
                priority: 'medium' as const,
                category: 'Health',
                due_at: toIsoString(today),
              },
              {
                title: 'Study React Native & SQLite performance',
                description: 'Read up on WAL mode, index optimization, and memory bounds.',
                priority: 'high' as const,
                category: 'Study',
                due_at: toIsoString(tomorrow),
              },
            ];

            for (const item of sampleTasks) {
              await createTask(item);
            }

            Alert.alert('Success', '5 demo tasks created with audit history logs!');
          },
        },
      ]
    );
  };

  const handleClearCompleted = async () => {
    if (!db) return;
    Alert.alert(
      'Clear Completed Tasks',
      'This will soft-delete all completed tasks and create deletion logs. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All Completed',
          style: 'destructive',
          onPress: async () => {
            await db.runAsync(
              `UPDATE tasks SET deleted_at = ? WHERE status = 'completed' AND deleted_at IS NULL;`,
              toIsoString()
            );
            await Promise.all([refreshTasks(), refreshStats(), refreshTimeline()]);
            Alert.alert('Done', 'Completed tasks moved to trash.');
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}
      contentContainerStyle={styles.scrollContent}>
      {/* App Info Card */}
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        <View style={styles.appHeader}>
          <View style={styles.appIconWrap}>
            <Ionicons name="checkbox-outline" size={28} color="#2563EB" />
          </View>
          <View>
            <Text style={[styles.appName, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              My To-Do
            </Text>
            <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Version 1.0.0 • Offline-First Task Manager
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Local Database Engine
          </Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            SQLite (expo-sqlite 57)
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Total Stored Tasks
          </Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {stats?.totalTasks ?? 0}
          </Text>
        </View>

        <View style={styles.statRow}>
          <Text style={[styles.statLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Audit History Events
          </Text>
          <Text style={[styles.statValue, { color: isDark ? '#FFFFFF' : '#111827' }]}>
            {timeline?.length ?? 0}
          </Text>
        </View>
      </View>

      {/* Preferences Section */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Preferences
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.switchTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              Task Reminders
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Allow local notifications for scheduled deadlines
            </Text>
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: '#767577', true: '#2563EB' }}
          />
        </View>
      </View>

      {/* Data Management Section */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Data & Testing
      </Text>
      <View
        style={[
          styles.card,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSeedData}
          style={styles.actionItem}>
          <Ionicons name="sparkles-outline" size={20} color="#2563EB" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
              Seed Sample Demo Tasks
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Populates realistic tasks and history for instant testing
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleClearCompleted}
          style={styles.actionItem}>
          <Ionicons name="trash-bin-outline" size={20} color="#EF4444" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
              Clear Completed Tasks
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280' }}>
              Move all completed tasks to archive/trash
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Privacy Notice */}
      <View
        style={[
          styles.privacyBox,
          {
            backgroundColor: isDark ? '#111827' : '#EFF6FF',
            borderColor: isDark ? '#1E3A8A' : '#BFDBFE',
          },
        ]}>
        <Ionicons name="shield-checkmark-outline" size={24} color="#2563EB" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.privacyTitle, { color: isDark ? '#93C5FD' : '#1E40AF' }]}>
            100% Offline & Private
          </Text>
          <Text
            style={[
              styles.privacyBody,
              { color: isDark ? '#BFDBFE' : '#1E3A8A' },
            ]}>
            All tasks, descriptions, and audit history logs are stored strictly on your device inside SQLite. No data is transmitted to external servers.
          </Text>
        </View>
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
    gap: 16,
    paddingBottom: 40,
  },
  card: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  appIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appName: {
    fontSize: 18,
    fontWeight: '800',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 13,
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  privacyBox: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  privacyBody: {
    fontSize: 12,
    lineHeight: 17,
  },
});
