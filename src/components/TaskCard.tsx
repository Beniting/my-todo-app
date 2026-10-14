import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Task } from '@/features/tasks/task.types';
import { PriorityBadge } from './PriorityBadge';
import { CategoryBadge } from './CategoryBadge';
import { formatDisplayDate, isOverdue } from '@/utils/date';

interface TaskCardProps {
  task: Task;
  onToggle: (task: Task) => void;
  onDelete?: (id: string) => void;
}

export function TaskCard({ task, onToggle, onDelete }: TaskCardProps) {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const completed = task.status === 'completed';
  const overdue = isOverdue(task.due_at, task.status);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
          opacity: completed ? 0.75 : 1,
        },
      ]}
      onPress={() => router.push(`/tasks/${task.id}`)}>
      {/* Checkbox */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onToggle(task)}
        style={[
          styles.checkbox,
          completed && styles.checkboxCompleted,
          {
            borderColor: completed
              ? '#10B981'
              : isDark
              ? '#4B5563'
              : '#9CA3AF',
          },
        ]}>
        {completed && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
      </TouchableOpacity>

      {/* Main Content */}
      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text
            numberOfLines={2}
            style={[
              styles.title,
              { color: isDark ? '#F3F4F6' : '#111827' },
              completed && styles.titleCompleted,
            ]}>
            {task.title}
          </Text>
        </View>

        {task.description ? (
          <Text
            numberOfLines={1}
            style={[
              styles.description,
              { color: isDark ? '#9CA3AF' : '#6B7280' },
              completed && styles.titleCompleted,
            ]}>
            {task.description}
          </Text>
        ) : null}

        {/* Footer badges & due date */}
        <View style={styles.footerRow}>
          <PriorityBadge priority={task.priority} size="small" />

          {task.category ? <CategoryBadge category={task.category} /> : null}

          {task.due_at ? (
            <View
              style={[
                styles.dateBadge,
                overdue && styles.dateBadgeOverdue,
              ]}>
              <Ionicons
                name={overdue ? 'alert-circle' : 'calendar-outline'}
                size={12}
                color={overdue ? '#DC2626' : '#6B7280'}
              />
              <Text
                style={[
                  styles.dateText,
                  { color: overdue ? '#DC2626' : '#6B7280' },
                ]}>
                {overdue ? 'Overdue: ' : ''}
                {formatDisplayDate(task.due_at)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Trailing arrow / delete */}
      {onDelete ? (
        <TouchableOpacity
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => onDelete(task.id)}
          style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={18} color="#9CA3AF" />
        </TouchableOpacity>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    marginRight: 12,
  },
  checkboxCompleted: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  content: {
    flex: 1,
    gap: 6,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
  },
  titleCompleted: {
    textDecorationLine: 'line-through',
    color: '#9CA3AF',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
  },
  dateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  dateBadgeOverdue: {
    backgroundColor: '#FEE2E2',
  },
  dateText: {
    fontSize: 11,
    fontWeight: '500',
  },
  deleteButton: {
    padding: 4,
    marginLeft: 6,
  },
});
