import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  useColorScheme,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { Priority, PRESET_CATEGORIES } from '@/features/tasks/task.types';
import { validateTaskInput } from '@/features/tasks/task.validation';
import { TimePeriodPicker } from '@/components/TimePeriodPicker';

export default function NewTaskScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams<{ date?: string }>();
  const initialDate = Array.isArray(searchParams.date) ? searchParams.date[0] : searchParams.date;
  const isDark = useColorScheme() === 'dark';
  const { createTask } = useTodo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<Priority>('medium');
  const [category, setCategory] = useState<string>('General');
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // Time period state
  const [startAt, setStartAt] = useState<string | null>(null);
  const [dueAt, setDueAt] = useState<string | null>(null);

  const handlePeriodChange = useCallback(
    ({ start_at, due_at }: { start_at: string | null; due_at: string | null }) => {
      setStartAt(start_at);
      setDueAt(due_at);
    },
    []
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSave = async () => {
    if (isSubmitting) return;

    const selectedCategory = showCustomCategory
      ? customCategory.trim() || 'General'
      : category;

    const input = {
      title,
      description: description.trim() || null,
      priority,
      category: selectedCategory,
      start_at: startAt,
      due_at: dueAt,
    };

    const validation = validateTaskInput(input);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    try {
      setIsSubmitting(true);
      await createTask(input);
      router.back();
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  const priorities: { value: Priority; label: string; color: string }[] = [
    { value: 'low', label: 'Low', color: '#10B981' },
    { value: 'medium', label: 'Medium', color: '#F59E0B' },
    { value: 'high', label: 'High', color: '#EF4444' },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={[
          styles.container,
          { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
        ]}>
        {/* Title Input */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E5E7EB' : '#374151' }]}>
            Task Title <Text style={{ color: '#EF4444' }}>*</Text>
          </Text>
          <TextInput
            placeholder="e.g. Finish quarterly project report"
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (errors.title) setErrors((prev) => ({ ...prev, title: '' }));
            }}
            style={[
              styles.input,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: errors.title
                  ? '#EF4444'
                  : isDark
                  ? '#2C2C2E'
                  : '#E5E7EB',
                color: isDark ? '#FFFFFF' : '#111827',
              },
            ]}
          />
          {errors.title ? (
            <Text style={styles.errorText}>{errors.title}</Text>
          ) : null}
        </View>

        {/* Description Input */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E5E7EB' : '#374151' }]}>
            Description (Optional)
          </Text>
          <TextInput
            placeholder="Add relevant notes, links, or context..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
            style={[
              styles.input,
              styles.textArea,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
                color: isDark ? '#FFFFFF' : '#111827',
              },
            ]}
          />
        </View>

        {/* Time Period Picker (Start time to End time + Notifications) */}
        <View style={styles.formGroup}>
          <TimePeriodPicker
            initialDate={initialDate}
            onChange={handlePeriodChange}
          />
        </View>

        {/* Priority Selector */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E5E7EB' : '#374151' }]}>
            Priority
          </Text>
          <View style={styles.pillsRow}>
            {priorities.map((item) => {
              const selected = priority === item.value;
              return (
                <TouchableOpacity
                  key={item.value}
                  activeOpacity={0.8}
                  onPress={() => setPriority(item.value)}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected
                        ? `${item.color}20`
                        : isDark
                        ? '#1C1C1E'
                        : '#FFFFFF',
                      borderColor: selected
                        ? item.color
                        : isDark
                        ? '#2C2C2E'
                        : '#E5E7EB',
                    },
                  ]}>
                  <View
                    style={[styles.priorityDot, { backgroundColor: item.color }]}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: selected
                          ? item.color
                          : isDark
                          ? '#D1D5DB'
                          : '#4B5563',
                        fontWeight: selected ? '700' : '500',
                      },
                    ]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Category Selector */}
        <View style={styles.formGroup}>
          <Text style={[styles.label, { color: isDark ? '#E5E7EB' : '#374151' }]}>
            Category
          </Text>
          <View style={styles.pillsRow}>
            {PRESET_CATEGORIES.map((cat) => {
              const selected = !showCustomCategory && category === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  activeOpacity={0.8}
                  onPress={() => {
                    setCategory(cat);
                    setShowCustomCategory(false);
                  }}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: selected
                        ? '#2563EB20'
                        : isDark
                        ? '#1C1C1E'
                        : '#FFFFFF',
                      borderColor: selected
                        ? '#2563EB'
                        : isDark
                        ? '#2C2C2E'
                        : '#E5E7EB',
                    },
                  ]}>
                  <Text
                    style={[
                      styles.pillText,
                      {
                        color: selected
                          ? '#2563EB'
                          : isDark
                          ? '#D1D5DB'
                          : '#4B5563',
                        fontWeight: selected ? '700' : '500',
                      },
                    ]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => setShowCustomCategory(true)}
              style={[
                styles.pill,
                {
                  backgroundColor: showCustomCategory
                    ? '#2563EB20'
                    : isDark
                    ? '#1C1C1E'
                    : '#FFFFFF',
                  borderColor: showCustomCategory
                    ? '#2563EB'
                    : isDark
                    ? '#2C2C2E'
                    : '#E5E7EB',
                },
              ]}>
              <Text
                style={[
                  styles.pillText,
                  {
                    color: showCustomCategory
                      ? '#2563EB'
                      : isDark
                      ? '#D1D5DB'
                      : '#4B5563',
                    fontWeight: showCustomCategory ? '700' : '500',
                  },
                ]}>
                + Custom
              </Text>
            </TouchableOpacity>
          </View>

          {showCustomCategory && (
            <TextInput
              placeholder="Enter custom category"
              placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
              value={customCategory}
              onChangeText={setCustomCategory}
              style={[
                styles.input,
                {
                  marginTop: 8,
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
                  color: isDark ? '#FFFFFF' : '#111827',
                },
              ]}
            />
          )}
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => router.back()}
            style={[
              styles.cancelButton,
              {
                backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
              },
            ]}>
            <Text
              style={[
                styles.cancelButtonText,
                { color: isDark ? '#D1D5DB' : '#4B5563' },
              ]}>
              Cancel
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.8}
            onPress={handleSave}
            disabled={isSubmitting}
            style={[styles.saveButton, isSubmitting && { opacity: 0.6 }]}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>
              {isSubmitting ? 'Saving...' : 'Create Task'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    height: 80,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 2,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  pillText: {
    fontSize: 13,
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 40,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    flexDirection: 'row',
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
