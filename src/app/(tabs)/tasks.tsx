import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTodo } from '@/context/TodoContext';
import { TaskCard } from '@/components/TaskCard';
import { EmptyState } from '@/components/EmptyState';
import { Task, Priority, TaskStatus, PRESET_CATEGORIES } from '@/features/tasks/task.types';

const CATEGORY_META: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  Work: { icon: 'briefcase', color: '#3B82F6' },
  Personal: { icon: 'person', color: '#8B5CF6' },
  Study: { icon: 'book', color: '#10B981' },
  Health: { icon: 'fitness', color: '#EC4899' },
  Shopping: { icon: 'cart', color: '#F59E0B' },
  Finance: { icon: 'wallet', color: '#14B8A6' },
  General: { icon: 'folder', color: '#6B7280' },
};

function getCategoryMeta(cat: string) {
  return (
    CATEGORY_META[cat] || {
      icon: 'pricetag',
      color: '#6366F1',
    }
  );
}

export default function TaskListScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { tasks, stats, filter, setFilter, sort, setSort, toggleTask, deleteTask } = useTodo();

  const [search, setSearch] = useState(filter.searchQuery || '');
  const [showFilters, setShowFilters] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(false);

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

  // Collect all available categories dynamically (presets + custom)
  const allCategoryNames = useMemo(() => {
    const set = new Set<string>(PRESET_CATEGORIES);
    if (stats?.categoryBreakdown) {
      Object.keys(stats.categoryBreakdown).forEach((c) => {
        if (c) set.add(c);
      });
    }
    tasks.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set);
  }, [stats, tasks]);

  // Grouped tasks by category for "Group by Category" view mode
  const groupedByCategoryList = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const cat = t.category || 'General';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(t);
    }
    return Array.from(map.entries()).map(([category, items]) => {
      const completed = items.filter((i) => i.status === 'completed').length;
      const total = items.length;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
      return {
        category,
        items,
        completed,
        total,
        percent,
      };
    });
  }, [tasks]);

  const totalAllCount = stats?.totalTasks ?? tasks.length;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: isDark ? '#000000' : '#F9FAFB' },
      ]}>
      {/* Search Bar & Filter Drawer Toggle */}
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

      {/* Horizontal Category Navigation Bar */}
      <View style={styles.categoryBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}>
          {/* All category pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleCategoryFilter('all')}
            style={[
              styles.categoryPill,
              filter.category === 'all' && styles.categoryPillActive,
              {
                backgroundColor:
                  filter.category === 'all'
                    ? '#2563EB'
                    : isDark
                    ? '#1C1C1E'
                    : '#FFFFFF',
                borderColor:
                  filter.category === 'all'
                    ? '#2563EB'
                    : isDark
                    ? '#2C2C2E'
                    : '#E5E7EB',
              },
            ]}>
            <Ionicons
              name="grid-outline"
              size={13}
              color={filter.category === 'all' ? '#FFFFFF' : isDark ? '#D1D5DB' : '#4B5563'}
            />
            <Text
              style={[
                styles.categoryPillText,
                filter.category === 'all' && styles.categoryPillTextActive,
                { color: filter.category === 'all' ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151' },
              ]}>
              All
            </Text>
            <View
              style={[
                styles.categoryCountBadge,
                {
                  backgroundColor:
                    filter.category === 'all'
                      ? 'rgba(255,255,255,0.25)'
                      : isDark
                      ? '#2C2C2E'
                      : '#F3F4F6',
                },
              ]}>
              <Text
                style={[
                  styles.categoryCountText,
                  { color: filter.category === 'all' ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280' },
                ]}>
                {totalAllCount}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Specific category pills */}
          {allCategoryNames.map((cat) => {
            const isSelected = filter.category === cat;
            const meta = getCategoryMeta(cat);
            const count = stats?.categoryBreakdown[cat] ?? 0;

            return (
              <TouchableOpacity
                key={cat}
                activeOpacity={0.7}
                onPress={() => handleCategoryFilter(cat)}
                style={[
                  styles.categoryPill,
                  isSelected && styles.categoryPillActive,
                  {
                    backgroundColor: isSelected
                      ? meta.color
                      : isDark
                      ? '#1C1C1E'
                      : '#FFFFFF',
                    borderColor: isSelected
                      ? meta.color
                      : isDark
                      ? '#2C2C2E'
                      : '#E5E7EB',
                  },
                ]}>
                <Ionicons
                  name={meta.icon as any}
                  size={13}
                  color={isSelected ? '#FFFFFF' : meta.color}
                />
                <Text
                  style={[
                    styles.categoryPillText,
                    isSelected && styles.categoryPillTextActive,
                    { color: isSelected ? '#FFFFFF' : isDark ? '#D1D5DB' : '#374151' },
                  ]}>
                  {cat}
                </Text>
                {count > 0 && (
                  <View
                    style={[
                      styles.categoryCountBadge,
                      {
                        backgroundColor: isSelected
                          ? 'rgba(255,255,255,0.25)'
                          : isDark
                          ? '#2C2C2E'
                          : '#F3F4F6',
                      },
                    ]}>
                    <Text
                      style={[
                        styles.categoryCountText,
                        { color: isSelected ? '#FFFFFF' : isDark ? '#9CA3AF' : '#6B7280' },
                      ]}>
                      {count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
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

      {/* Task Count & View Options Header */}
      <View style={styles.countBar}>
        <Text style={[styles.countText, { color: isDark ? '#9CA3AF' : '#6B7280' }]}>
          {filter.category !== 'all' ? `Category: ${filter.category} · ` : ''}
          Showing {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
        </Text>

        {filter.category === 'all' && tasks.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setGroupByCategory(!groupByCategory)}
            style={[
              styles.groupByBtn,
              groupByCategory && styles.groupByBtnActive,
              {
                backgroundColor: groupByCategory
                  ? 'rgba(37, 99, 235, 0.15)'
                  : isDark
                  ? '#1C1C1E'
                  : '#F3F4F6',
              },
            ]}>
            <Ionicons
              name={groupByCategory ? 'layers' : 'layers-outline'}
              size={13}
              color={groupByCategory ? '#2563EB' : isDark ? '#9CA3AF' : '#6B7280'}
            />
            <Text
              style={[
                styles.groupByBtnText,
                { color: groupByCategory ? '#2563EB' : isDark ? '#9CA3AF' : '#6B7280' },
              ]}>
              {groupByCategory ? 'Grouped' : 'Group by Category'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Task List: Grouped by Category vs Flat List */}
      {groupByCategory && filter.category === 'all' ? (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}>
          {groupedByCategoryList.length === 0 ? (
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
          ) : (
            groupedByCategoryList.map((group) => {
              const meta = getCategoryMeta(group.category);

              return (
                <View key={group.category} style={styles.categorySection}>
                  {/* Category Section Header Card */}
                  <View
                    style={[
                      styles.categorySectionHeader,
                      {
                        backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                        borderColor: isDark ? '#2C2C2E' : '#E5E7EB',
                      },
                    ]}>
                    <View style={styles.catHeaderLeft}>
                      <View
                        style={[
                          styles.catIconWrap,
                          { backgroundColor: `${meta.color}20` },
                        ]}>
                        <Ionicons name={meta.icon as any} size={15} color={meta.color} />
                      </View>
                      <View>
                        <Text
                          style={[
                            styles.catTitleText,
                            { color: isDark ? '#FFFFFF' : '#111827' },
                          ]}>
                          {group.category}
                        </Text>
                        <Text
                          style={[
                            styles.catSubtitleText,
                            { color: isDark ? '#9CA3AF' : '#6B7280' },
                          ]}>
                          {group.total} {group.total === 1 ? 'task' : 'tasks'} · {group.completed} completed
                        </Text>
                      </View>
                    </View>

                    <View style={styles.catHeaderRight}>
                      <Text style={[styles.catPercentText, { color: meta.color }]}>
                        {group.percent}%
                      </Text>
                    </View>
                  </View>

                  {/* Category Progress Bar */}
                  <View
                    style={[
                      styles.catProgressTrack,
                      { backgroundColor: isDark ? '#2C2C2E' : '#E5E7EB' },
                    ]}>
                    <View
                      style={[
                        styles.catProgressBar,
                        { width: `${group.percent}%`, backgroundColor: meta.color },
                      ]}
                    />
                  </View>

                  {/* Tasks in this category */}
                  <View style={styles.catTasksList}>
                    {group.items.map((item) => (
                      <TaskCard
                        key={item.id}
                        task={item}
                        onToggle={toggleTask}
                        onDelete={handleDeleteWithConfirm}
                      />
                    ))}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : (
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
              title={filter.category !== 'all' ? `No tasks in ${filter.category}` : 'No tasks found'}
              subtitle={
                filter.category !== 'all'
                  ? `You haven't scheduled any tasks in the ${filter.category} category.`
                  : activeFilterCount > 0 || search
                  ? 'Try adjusting your filters or search query.'
                  : 'Get started by creating your first task!'
              }
              actionLabel="+ Create Task"
              onAction={() => router.push('/tasks/new')}
            />
          }
        />
      )}

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
    paddingTop: 10,
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
  categoryBarWrapper: {
    paddingVertical: 4,
  },
  categoryScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  categoryPillActive: {
    borderColor: 'transparent',
  },
  categoryPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  categoryPillTextActive: {
    color: '#FFFFFF',
  },
  categoryCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 2,
  },
  categoryCountText: {
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  groupByBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  groupByBtnActive: {
    backgroundColor: 'rgba(37, 99, 235, 0.15)',
  },
  groupByBtnText: {
    fontSize: 11,
    fontWeight: '600',
  },
  categorySection: {
    marginBottom: 16,
  },
  categorySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 4,
  },
  catHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catTitleText: {
    fontSize: 14,
    fontWeight: '700',
  },
  catSubtitleText: {
    fontSize: 11,
  },
  catHeaderRight: {
    alignItems: 'flex-end',
  },
  catPercentText: {
    fontSize: 13,
    fontWeight: '700',
  },
  catProgressTrack: {
    height: 3,
    borderRadius: 1.5,
    overflow: 'hidden',
    marginBottom: 8,
    marginHorizontal: 4,
  },
  catProgressBar: {
    height: '100%',
    borderRadius: 1.5,
  },
  catTasksList: {
    gap: 2,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 4,
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
