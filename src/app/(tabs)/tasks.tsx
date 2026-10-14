import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { Priority, TaskStatus, PRESET_CATEGORIES } from '@/features/tasks/task.types';

export default function TaskListScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { tasks, filter, setFilter, sort, setSort, toggleTask, deleteTask } = useTodo();

  const [search, setSearch] = useState(filter.searchQuery || '');
  const [showFilters, setShowFilters] = useState(false);

  const handleSearchSubmit = () => {
    setFilter((prev) => ({ ...prev, searchQuery: search.trim() }));
  };

  const handleClearSearch = () => {
    setSearch('');
    setFilter((prev) => ({ ...prev, searchQuery: '' }));
  };

  const handleStatusFilter = (status: TaskStatus | 'all') => {
    setFilter((prev) => ({ ...prev, status }));
  };

  const handlePriorityFilter = (priority: Priority | 'all') => {
    setFilter((prev) => ({ ...prev, priority }));
  };

  const handleCategoryFilter = (category: string | 'all') => {
    setFilter((prev) => ({ ...prev, category }));
  };

  const handleSortChange = (field: 'due_at' | 'priority' | 'created_at' | 'title') => {
    setSort((prev) => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const activeFilterCount =
    (filter.status !== 'all' ? 1 : 0) +
    (filter.priority !== 'all' ? 1 : 0) +
    (filter.category !== 'all' ? 1 : 0) +
    (filter.overdueOnly ? 1 : 0);

  const handleDeleteWithConfirm = (id: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task? Deletion is logged in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTask(id),
        },
      ]
    );
  };

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}>
      {/* Search Bar & Filter Toggle */}
      <View style={styles.topSection}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
            },
          ]}>
          <Ionicons
            name="search-outline"
            size={18}
            color={isDark ? '#9CA3AF' : '#6B7280'}
          />
          <TextInput
            placeholder="Search tasks by title or notes..."
            placeholderTextColor={isDark ? '#6B7280' : '#9CA3AF'}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            style={[
              styles.searchInput,
              { color: isDark ? '#FFFFFF' : '#111827' },
            ]}
          />
          {search ? (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons
                name="close-circle"
                size={18}
                color={isDark ? '#9CA3AF' : '#6B7280'}
              />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setShowFilters(!showFilters)}
          style={[
            styles.filterToggleBtn,
            {
              backgroundColor:
                activeFilterCount > 0
                  ? '#2563EB'
                  : isDark
                  ? '#1C1C1E'
                  : '#FFFFFF',
              borderColor: activeFilterCount > 0 ? '#2563EB' : isDark ? '#2C2C2E' : '#E5E7EB',
            },
          ]}>
          <Ionicons
            name="filter-outline"
            size={18}
            color={
              activeFilterCount > 0
                ? '#FFFFFF'
                : isDark
                ? '#FFFFFF'
                : '#111827'
            }
          />
          {activeFilterCount > 0 && (
            <View style={styles.badgeCount}>
              <Text style={styles.badgeCountText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Expandable Filter & Sort Drawer */}
      {showFilters && (
        <View
          style={[
            styles.filterDrawer,
            {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
              borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
            },
          ]}>
          {/* Status Row */}
          <Text style={[styles.filterGroupTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Status
          </Text>
          <View style={styles.pillsRow}>
            {(['all', 'pending', 'completed'] as const).map((s) => (
              <TouchableOpacity
                key={s}
                onPress={() => handleStatusFilter(s)}
                style={[
                  styles.filterPill,
                  filter.status === s && styles.filterPillActive,
                ]}>
                <Text
                  style={[
                    styles.filterPillText,
                    filter.status === s && styles.filterPillTextActive,
                  ]}>
                  {s.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Priority Row */}
          <Text style={[styles.filterGroupTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Priority
          </Text>
          <View style={styles.pillsRow}>
            {(['all', 'high', 'medium', 'low'] as const).map((p) => (
              <TouchableOpacity
                key={p}
                onPress={() => handlePriorityFilter(p)}
                style={[
                  styles.filterPill,
                  filter.priority === p && styles.filterPillActive,
                ]}>
                <Text
                  style={[
                    styles.filterPillText,
                    filter.priority === p && styles.filterPillTextActive,
                  ]}>
                  {p.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Category Row */}
          <Text style={[styles.filterGroupTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Category
          </Text>
          <View style={styles.pillsRow}>
            {['all', ...PRESET_CATEGORIES].map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => handleCategoryFilter(c)}
                style={[
                  styles.filterPill,
                  filter.category === c && styles.filterPillActive,
                ]}>
                <Text
                  style={[
                    styles.filterPillText,
                    filter.category === c && styles.filterPillTextActive,
                  ]}>
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Sort Buttons */}
          <Text style={[styles.filterGroupTitle, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
            Sort By
          </Text>
          <View style={styles.pillsRow}>
            {[
              { id: 'created_at', label: 'Date Added' },
              { id: 'due_at', label: 'Due Date' },
              { id: 'priority', label: 'Priority' },
              { id: 'title', label: 'Alphabetical' },
            ].map((st) => (
              <TouchableOpacity
                key={st.id}
                onPress={() => handleSortChange(st.id as any)}
                style={[
                  styles.filterPill,
                  sort.field === st.id && styles.filterPillActive,
                ]}>
                <Text
                  style={[
                    styles.filterPillText,
                    sort.field === st.id && styles.filterPillTextActive,
                  ]}>
                  {st.label} {sort.field === st.id ? (sort.direction === 'asc' ? '↑' : '↓') : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Reset Filters */}
          {activeFilterCount > 0 && (
            <TouchableOpacity
              onPress={() =>
                setFilter({
                  status: 'all',
                  priority: 'all',
                  category: 'all',
                  searchQuery: '',
                })
              }
              style={styles.resetFiltersBtn}>
              <Ionicons name="refresh" size={14} color="#EF4444" />
              <Text style={styles.resetFiltersText}>Reset All Filters</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Task Count & Active Query Header */}
      <View style={styles.countBar}>
        <Text style={[styles.countText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      {/* Task List */}
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TaskCard
            task={item}
            onToggle={toggleTask}
            onDelete={handleDeleteWithConfirm}
          />
        )}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            icon="list-outline"
            title="No tasks found"
            subtitle={
              activeFilterCount > 0 || search
                ? 'Try adjusting your filters or search query.'
                : 'Get started by creating your first task!'
            }
            actionLabel="+ Create Task"
            onAction={() => router.push('/tasks/new')}
          />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => router.push('/tasks/new')}
        style={styles.fab}>
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
    gap: 10,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterToggleBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  filterDrawer: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  filterGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginTop: 4,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
  },
  filterPillActive: {
    backgroundColor: '#2563EB',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5563',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  resetFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 6,
  },
  resetFiltersText: {
    color: '#EF4444',
    fontSize: 12,
    fontWeight: '600',
  },
  countBar: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 90,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
});
