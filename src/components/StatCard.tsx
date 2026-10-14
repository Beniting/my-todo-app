import React from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtext?: string;
}

export function StatCard({ label, value, icon, color, subtext }: StatCardProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
          borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
        },
      ]}>
      <View style={styles.topRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${color}15` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={[styles.value, { color: isDark ? '#FFFFFF' : '#111827' }]}>
          {value}
        </Text>
      </View>
      <Text style={[styles.label, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
        {label}
      </Text>
      {subtext ? (
        <Text style={[styles.subtext, { color: isDark ? '#6B7280' : '#9CA3AF' }]}>
          {subtext}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: '45%',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
    gap: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 22,
    fontWeight: '700',
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  subtext: {
    fontSize: 11,
    marginTop: 2,
  },
});
