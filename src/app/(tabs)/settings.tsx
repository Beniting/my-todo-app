import React, { useState, useEffect } from 'react';
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
import { ReminderService } from '@/features/reminders/reminder.service';

export default function SettingsScreen() {
  const isDark = useColorScheme() === 'dark';
  const { db, stats, timeline, refreshTasks, refreshStats, refreshTimeline } = useTodo();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [pushToken, setPushToken] = useState<string | null>(null);

  useEffect(() => {
    // Automatically register and enable push notifications for the final build
    (async () => {
      const token = await ReminderService.registerForPushNotificationsAsync();
      if (token) {
        setPushToken(token);
        setNotificationsEnabled(true);
      }
    })();
  }, []);

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const token = await ReminderService.registerForPushNotificationsAsync();
      const granted = await ReminderService.requestPermissions();
      setNotificationsEnabled(granted);
      if (token) setPushToken(token);
      if (!granted) {
        Alert.alert(
          'Notifications Required',
          'Please enable notification permissions in your device settings to receive task alarms.'
        );
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleClearCompleted = async () => {
    if (!db) return;
    Alert.alert(
      'Clear Completed Tasks',
      'This will archive and delete all completed tasks. Audit history will record this action. Proceed?',
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
            Alert.alert('Done', 'Completed tasks successfully cleared.');
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
            <Text style={{ fontSize: 13, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
              Version 1.0.0
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

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
            Completed Tasks
          </Text>
          <Text style={[styles.statValue, { color: '#10B981' }]}>
            {stats?.completedTasks ?? 0}
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
          <View style={{ flex: 1, paddingRight: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={[styles.switchTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
                Push & Task Notifications
              </Text>
              {notificationsEnabled && (
                <View style={styles.activeBadge}>
                  <Text style={styles.activeBadgeText}>ACTIVE</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 4 }}>
              Alerts at task start time and 15 mins before due deadline
            </Text>
            {Boolean(pushToken) && (
              <Text style={{ fontSize: 11, color: '#10B981', marginTop: 3 }}>
                ✓ Native push service registered
              </Text>
            )}
          </View>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleToggleNotifications}
            trackColor={{ false: '#767577', true: '#2563EB' }}
          />
        </View>
      </View>

      {/* Data Management Section (changed from Data & Testing) */}
      <Text style={[styles.sectionTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        Data Management
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
          onPress={handleClearCompleted}
          style={styles.actionItem}>
          <View style={[styles.actionIconWrap, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="trash-bin-outline" size={18} color="#EF4444" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.actionTitle, { color: '#EF4444' }]}>
              Clear Completed Tasks
            </Text>
            <Text style={{ fontSize: 12, color: isDark ? '#9CA3AF' : '#6B7280', marginTop: 2 }}>
              Archive and remove all finished tasks from the active list
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>

      {/* Security & Privacy Notice */}
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
            Private & Secure
          </Text>
          <Text
            style={[
              styles.privacyBody,
              { color: isDark ? '#BFDBFE' : '#1E3A8A' },
            ]}>
            All your tasks, planned time periods, and activity history are stored securely on your device. Scheduled notifications alert you on time without transmitting your data.
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
    fontWeight: '700',
  },
  activeBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activeBadgeText: {
    color: '#16A34A',
    fontSize: 10,
    fontWeight: '800',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  privacyBox: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  privacyTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  privacyBody: {
    fontSize: 12,
    lineHeight: 18,
  },
});
