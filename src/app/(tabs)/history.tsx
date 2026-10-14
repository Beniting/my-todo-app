import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { HistoryAction } from '@/features/history/history.types';
import { EmptyState } from '@/components/EmptyState';
import { formatDisplayDate, formatRelativeTime } from '@/utils/date';

export default function HistoryScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { timeline, refreshTimeline } = useTodo();
  const [selectedAction, setSelectedAction] = useState<HistoryAction | 'all'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    await refreshTimeline(selectedAction === 'all' ? undefined : selectedAction);
  }, [selectedAction, refreshTimeline]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const actionsList: { id: HistoryAction | 'all'; label: string; color: string }[] = [
    { id: 'all', label: 'All', color: '#2563EB' },
    { id: 'created', label: 'Created', color: '#3B82F6' },
    { id: 'completed', label: 'Completed', color: '#10B981' },
    { id: 'reopened', label: 'Reopened', color: '#8B5CF6' },
    { id: 'updated', label: 'Updated', color: '#F59E0B' },
    { id: 'deleted', label: 'Deleted', color: '#EF4444' },
  ];

  const actionIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
    created: 'add-circle-outline',
    completed: 'checkmark-circle-outline',
    reopened: 'arrow-undo-outline',
    updated: 'create-outline',
    deleted: 'trash-outline',
    reminder_changed: 'notifications-outline',
  };

  const actionColors: Record<string, string> = {
    created: '#3B82F6',
    completed: '#10B981',
    reopened: '#8B5CF6',
    updated: '#F59E0B',
    deleted: '#EF4444',
    reminder_changed: '#06B6D4',
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}>
      {/* Action Filter Pills */}
      <View style={styles.filterBar}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={actionsList}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.filterPillsContainer}
          renderItem={({ item }) => {
            const active = selectedAction === item.id;
            return (
              <TouchableOpacity
                onPress={() => setSelectedAction(item.id)}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active
                      ? item.color
                      : isDark
                      ? '#1C1C1E'
                      : '#FFFFFF',
                    borderColor: active
                      ? item.color
                      : isDark
                      ? '#2C2C2E'
                      : '#E5E7EB',
                  },
                ]}>
                <Text
                  style={[
                    styles.filterPillText,
                    {
                      color: active
                        ? '#FFFFFF'
                        : isDark
                        ? '#D1D5DB'
                        : '#4B5563',
                      fontWeight: active ? '700' : '500',
                    },
                  ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* History Timeline List */}
      <FlatList
        data={timeline}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="No activity recorded"
            subtitle="Actions taken on tasks (created, completed, reopened, updated, deleted) will appear here in chronological order."
          />
        }
        renderItem={({ item, index }) => {
          const color = actionColors[item.action] || '#6B7280';
          const icon = actionIcons[item.action] || 'ellipse';

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                if (item.action !== 'deleted') {
                  router.push(`/tasks/${item.task_id}`);
                }
              }}
              style={[
                styles.timelineCard,
                {
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
                },
              ]}>
              <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
                <Ionicons name={icon} size={20} color={color} />
              </View>

              <View style={styles.cardContent}>
                <View style={styles.cardTopRow}>
                  <View style={[styles.actionBadge, { backgroundColor: `${color}20` }]}>
                    <Text style={[styles.actionBadgeText, { color }]}>
                      {item.action.toUpperCase()}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.timestampText,
                      { color: isDark ? '#9CA3AF' : '#6B7280' },
                    ]}>
                    {formatRelativeTime(item.occurred_at)}
                  </Text>
                </View>

                {item.task_title ? (
                  <Text
                    numberOfLines={1}
                    style={[
                      styles.taskTitle,
                      { color: isDark ? '#FFFFFF' : '#111827' },
                    ]}>
                    {item.task_title}
                  </Text>
                ) : null}

                {item.details ? (
                  <Text
                    style={[
                      styles.detailsText,
                      { color: isDark ? '#D1D5DB' : '#4B5563' },
                    ]}>
                    {item.details}
                  </Text>
                ) : null}

                <Text
                  style={[
                    styles.dateExact,
                    { color: isDark ? '#6B7280' : '#9CA3AF' },
                  ]}>
                  {formatDisplayDate(item.occurred_at, true)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  filterBar: {
    paddingVertical: 10,
  },
  filterPillsContainer: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterPillText: {
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    gap: 10,
  },
  timelineCard: {
    flexDirection: 'row',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  cardContent: {
    flex: 1,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actionBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  timestampText: {
    fontSize: 11,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  detailsText: {
    fontSize: 13,
    lineHeight: 18,
  },
  dateExact: {
    fontSize: 11,
    marginTop: 2,
  },
});
