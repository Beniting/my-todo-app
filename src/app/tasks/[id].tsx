import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useColorScheme,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { Task, Priority, PRESET_CATEGORIES } from '@/features/tasks/task.types';
import { TaskHistoryEntry } from '@/features/history/history.types';
import { PriorityBadge } from '@/components/PriorityBadge';
import { CategoryBadge } from '@/components/CategoryBadge';
import { LoadingState } from '@/components/LoadingState';
import { TimePeriodPicker } from '@/components/TimePeriodPicker';
import {
  formatDisplayDate,
  formatRelativeTime,
  formatTime,
  formatTimeRange,
  calculateDuration,
  isCurrentlyActive,
  isOverdue,
} from '@/utils/date';

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { getTaskById, getTaskHistory, updateTask, toggleTask, deleteTask } = useTodo();

  const [task, setTask] = useState<Task | null>(null);
  const [history, setHistory] = useState<TaskHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);

  // Edit fields
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editPriority, setEditPriority] = useState<Priority>('medium');
  const [editCategory, setEditCategory] = useState<string>('General');
  const [editStartAt, setEditStartAt] = useState<string | null>(null);
  const [editDueAt, setEditDueAt] = useState<string | null>(null);

  const handlePeriodChange = useCallback(
    ({ start_at, due_at }: { start_at: string | null; due_at: string | null }) => {
      setEditStartAt(start_at);
      setEditDueAt(due_at);
    },
    []
  );

  useEffect(() => {
    let isMounted = true;
    (async () => {
      if (!id) return;
      try {
        const [taskData, historyData] = await Promise.all([
          getTaskById(id),
          getTaskHistory(id),
        ]);
        if (isMounted) {
          setTask(taskData);
          setHistory(historyData);
          if (taskData) {
            setEditTitle(taskData.title);
            setEditDescription(taskData.description || '');
            setEditPriority(taskData.priority);
            setEditCategory(taskData.category || 'General');
            setEditStartAt(taskData.start_at);
            setEditDueAt(taskData.due_at);
          }
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to load task details:', err);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [id, getTaskById, getTaskHistory]);

  if (isLoading) {
    return <LoadingState message="Loading task details..." />;
  }

  if (!task) {
    return (
      <View style={[styles.centered, { backgroundColor: isDark ? '#000000' : '#F9FAFB' }]}>
        <Ionicons name="alert-circle-outline" size={48} color="#EF4444" />
        <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          Task Not Found
        </Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const completed = task.status === 'completed';
  const overdue = isOverdue(task.due_at, task.status);
  const activeNow = !completed && isCurrentlyActive(task.start_at, task.due_at);
  const timeRange = formatTimeRange(task.start_at, task.due_at);
  const duration = calculateDuration(task.start_at, task.due_at);
  const hasReminders = Boolean(task.start_notification_id || task.due_notification_id);

  const handleToggle = async () => {
    const updated = await toggleTask(task);
    if (updated) {
      setTask(updated);
      const newHistory = await getTaskHistory(task.id);
      setHistory(newHistory);
    }
  };

  const handleSaveEdit = async () => {
    if (!editTitle.trim()) {
      Alert.alert('Validation Error', 'Task title cannot be empty.');
      return;
    }

    const updated = await updateTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
      priority: editPriority,
      category: editCategory,
      start_at: editStartAt,
      due_at: editDueAt,
    });

    if (updated) {
      setTask(updated);
      setIsEditing(false);
      const newHistory = await getTaskHistory(task.id);
      setHistory(newHistory);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? Scheduled notifications will be cancelled and the action logged in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTask(task.id);
            router.back();
          },
        },
      ]
    );
  };

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#10B981' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'high', label: 'High', color: '#EF4444' },
  ];

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}
      contentContainerStyle={styles.scrollContent}>
      {/* Status & Action Bar */}
      <View
        style={[
          styles.statusBar,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        <View style={styles.statusLeft}>
          <View
            style={[
              styles.statusDot,
              { backgroundColor: completed ? '#10B981' : activeNow ? '#2563EB' : '#F59E0B' },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isDark ? '#FFFFFF' : '#111827' },
            ]}>
            {completed ? 'Completed' : activeNow ? 'In Progress' : 'Pending'}
          </Text>
        </View>

        <View style={styles.actionRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleToggle}
            style={[
              styles.actionButton,
              {
                backgroundColor: completed ? '#FEF3C7' : '#DCFCE7',
                borderColor: completed ? '#FCD34D' : '#86EFAC',
              },
            ]}>
            <Ionicons
              name={completed ? 'arrow-undo-outline' : 'checkmark-done-outline'}
              size={16}
              color={completed ? '#D97706' : '#16A34A'}
            />
            <Text
              style={[
                styles.actionBtnText,
                { color: completed ? '#D97706' : '#16A34A' },
              ]}>
              {completed ? 'Reopen' : 'Complete'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setIsEditing(!isEditing)}
            style={[
              styles.iconBtn,
              { backgroundColor: isDark ? '#2C2C2E' : '#F3F4F6' },
            ]}>
            <Ionicons
              name={isEditing ? 'close' : 'pencil'}
              size={18}
              color={isDark ? '#D1D5DB' : '#4B5563'}
            />
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleDelete}
            style={[
              styles.iconBtn,
              { backgroundColor: '#FEE2E2' },
            ]}>
            <Ionicons name="trash-outline" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Task Card */}
      <View
        style={[
          styles.mainCard,
          {
            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          },
        ]}>
        {isEditing ? (
          <View style={styles.editSection}>
            <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Title
            </Text>
            <TextInput
              value={editTitle}
              onChangeText={setEditTitle}
              style={[
                styles.textInput,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F9FAFB',
                  color: isDark ? '#FFFFFF' : '#111827',
                },
              ]}
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Description
            </Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              multiline
              numberOfLines={3}
              style={[
                styles.textInput,
                styles.textArea,
                {
                  backgroundColor: isDark ? '#2C2C2E' : '#F9FAFB',
                  color: isDark ? '#FFFFFF' : '#111827',
                },
              ]}
            />

            {/* Time Period in Edit Mode */}
            <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Schedule Time Period
            </Text>
            <TimePeriodPicker
              initialStartAt={editStartAt}
              initialDueAt={editDueAt}
              onChange={handlePeriodChange}
            />

            <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Priority
            </Text>
            <View style={styles.pillsRow}>
              {priorities.map((item) => {
                const selected = editPriority === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setEditPriority(item.value)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected
                          ? `${item.color}25`
                          : isDark
                          ? '#2C2C2E'
                          : '#F3F4F6',
                        borderColor: selected ? item.color : 'transparent',
                        borderWidth: 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: selected ? item.color : isDark ? '#D1D5DB' : '#4B5563',
                        fontWeight: selected ? '700' : '500',
                        fontSize: 12,
                      }}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={[styles.inputLabel, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
              Category
            </Text>
            <View style={styles.pillsRow}>
              {PRESET_CATEGORIES.map((cat) => {
                const selected = editCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setEditCategory(cat)}
                    style={[
                      styles.pill,
                      {
                        backgroundColor: selected
                          ? '#2563EB25'
                          : isDark
                          ? '#2C2C2E'
                          : '#F3F4F6',
                        borderColor: selected ? '#2563EB' : 'transparent',
                        borderWidth: 1,
                      },
                    ]}>
                    <Text
                      style={{
                        color: selected ? '#2563EB' : isDark ? '#D1D5DB' : '#4B5563',
                        fontWeight: selected ? '700' : '500',
                        fontSize: 12,
                      }}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={handleSaveEdit}
              style={styles.saveEditBtn}>
              <Ionicons name="checkmark" size={18} color="#FFFFFF" />
              <Text style={styles.saveEditBtnText}>Save Changes</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={{ gap: 14 }}>
            <Text
              style={[
                styles.title,
                { color: isDark ? '#FFFFFF' : '#111827' },
                completed && styles.titleCompleted,
              ]}>
              {task.title}
            </Text>

            {task.description ? (
              <Text
                style={[
                  styles.description,
                  { color: isDark ? '#D1D5DB' : '#4B5563' },
                ]}>
                {task.description}
              </Text>
            ) : null}

            {/* Scheduled Time Period Banner */}
            {timeRange ? (
              <View
                style={[
                  styles.timeBanner,
                  {
                    backgroundColor: activeNow
                      ? isDark
                        ? '#1E3A8A'
                        : '#EFF6FF'
                      : isDark
                      ? '#252629'
                      : '#F8FAFC',
                    borderColor: activeNow ? '#3B82F6' : isDark ? '#374151' : '#E2E8F0',
                  },
                ]}>
                <View style={styles.timeBannerHeader}>
                  <Ionicons name="time" size={18} color="#2563EB" />
                  <Text style={[styles.timeBannerTitle, { color: isDark ? '#FFFFFF' : '#0F172A' }]}>
                    Planned Time Period: {timeRange}
                  </Text>
                  {duration ? <Text style={styles.durationPill}>({duration})</Text> : null}
                </View>

                {hasReminders && !completed && (
                  <View style={styles.remindersInfoRow}>
                    <Ionicons name="notifications" size={14} color="#2563EB" />
                    <Text
                      style={[
                        styles.remindersInfoText,
                        { color: isDark ? '#93C5FD' : '#1D4ED8' },
                      ]}>
                      Alerts at {formatTime(task.start_at)} and 15 mins before {formatTime(task.due_at)}
                    </Text>
                  </View>
                )}
              </View>
            ) : null}

            <View style={styles.metaRow}>
              <PriorityBadge priority={task.priority} size="medium" />
              {task.category ? <CategoryBadge category={task.category} /> : null}

              {task.due_at ? (
                <View
                  style={[
                    styles.dueBadge,
                    overdue && styles.dueBadgeOverdue,
                  ]}>
                  <Ionicons
                    name={overdue ? 'alert-circle' : 'calendar-outline'}
                    size={14}
                    color={overdue ? '#DC2626' : '#4B5563'}
                  />
                  <Text
                    style={[
                      styles.dueText,
                      { color: overdue ? '#DC2626' : '#4B5563' },
                    ]}>
                    {overdue ? 'Overdue: ' : 'Due: '}
                    {formatDisplayDate(task.due_at, true)}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* Timestamps */}
            <View style={styles.timestampBox}>
              <Text style={[styles.timestampText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                Created: {formatDisplayDate(task.created_at, true)}
              </Text>
              <Text style={[styles.timestampText, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
                Last updated: {formatDisplayDate(task.updated_at, true)}
              </Text>
              {task.completed_at ? (
                <Text style={[styles.timestampText, { color: '#10B981' }]}>
                  Completed: {formatDisplayDate(task.completed_at, true)}
                </Text>
              ) : null}
            </View>
          </View>
        )}
      </View>

      {/* History Audit Log */}
      <View style={styles.historySection}>
        <View style={styles.historyHeader}>
          <Ionicons name="time-outline" size={20} color="#2563EB" />
          <Text
            style={[
              styles.historyTitle,
              { color: isDark ? '#FFFFFF' : '#111827' },
            ]}>
            Audit History ({history.length})
          </Text>
        </View>

        {history.length === 0 ? (
          <Text style={{ color: isDark ? '#6B7280' : '#9CA3AF', fontSize: 13 }}>
            No history recorded yet.
          </Text>
        ) : (
          <View style={styles.timelineList}>
            {history.map((item, idx) => {
              const actionColors: Record<string, string> = {
                created: '#2563EB',
                updated: '#F59E0B',
                completed: '#10B981',
                reopened: '#8B5CF6',
                deleted: '#EF4444',
                reminder_changed: '#06B6D4',
              };
              const color = actionColors[item.action] || '#6B7280';

              return (
                <View key={item.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: color }]} />
                    {idx < history.length - 1 && (
                      <View
                        style={[
                          styles.timelineLine,
                          { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' },
                        ]}
                      />
                    )}
                  </View>
                  <View style={styles.timelineRight}>
                    <View style={styles.timelineTopRow}>
                      <Text style={[styles.actionTag, { color }]}>
                        {item.action.toUpperCase()}
                      </Text>
                      <Text
                        style={[
                          styles.timeAgo,
                          { color: isDark ? '#6B7280' : '#9CA3AF' },
                        ]}>
                        {formatRelativeTime(item.occurred_at)}
                      </Text>
                    </View>
                    {item.details ? (
                      <Text
                        style={[
                          styles.timelineDetails,
                          { color: isDark ? '#D1D5DB' : '#374151' },
                        ]}>
                        {item.details}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
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
    gap: 16,
    paddingBottom: 40,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  backButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: {
    fontSize: 15,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mainCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 28,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
  },
  timeBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  timeBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  timeBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  durationPill: {
    fontSize: 12,
    fontWeight: '600',
    color: '#2563EB',
  },
  remindersInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  remindersInfoText: {
    fontSize: 12,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  dueBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  dueBadgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  dueText: {
    fontSize: 12,
    fontWeight: '500',
  },
  timestampBox: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
    gap: 2,
  },
  timestampText: {
    fontSize: 11,
  },
  editSection: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  textInput: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    fontSize: 15,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  saveEditBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 8,
  },
  saveEditBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  historySection: {
    gap: 12,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  timelineList: {
    paddingLeft: 4,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: 12,
    minHeight: 50,
  },
  timelineLeft: {
    alignItems: 'center',
    width: 14,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    marginVertical: 4,
  },
  timelineRight: {
    flex: 1,
    paddingBottom: 14,
  },
  timelineTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  actionTag: {
    fontSize: 11,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 11,
  },
  timelineDetails: {
    fontSize: 13,
  },
});
