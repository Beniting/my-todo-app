import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Priority } from '@/features/tasks/task.types';

interface PriorityBadgeProps {
  priority: Priority;
  size?: 'small' | 'medium';
}

export function PriorityBadge({ priority, size = 'small' }: PriorityBadgeProps) {
  const config = {
    high: {
      label: 'High',
      bg: '#FEE2E2',
      border: '#FCA5A5',
      text: '#DC2626',
    },
    medium: {
      label: 'Medium',
      bg: '#FEF3C7',
      border: '#FCD34D',
      text: '#D97706',
    },
    low: {
      label: 'Low',
      bg: '#DCFCE7',
      border: '#86EFAC',
      text: '#16A34A',
    },
  }[priority] || {
    label: priority,
    bg: '#F3F4F6',
    border: '#E5E7EB',
    text: '#4B5563',
  };

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: config.bg,
          borderColor: config.border,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}>
      <View style={[styles.dot, { backgroundColor: config.text }]} />
      <Text
        style={[
          styles.text,
          {
            color: config.text,
            fontSize: isSmall ? 11 : 13,
          },
        ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
