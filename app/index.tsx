import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

const STORAGE_KEY = '@todolist/items';

type Todo = {
  id: string;
  title: string;
  done: boolean;
};

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function TodoScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme() ?? 'light';
  const palette = Colors[colorScheme];
  const [todos, setTodos] = useState<Todo[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (raw) {
          const parsed = JSON.parse(raw) as Todo[];
          if (Array.isArray(parsed)) {
            setTodos(parsed);
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(todos)).catch(() => {});
  }, [todos, loading]);

  const addTodo = useCallback(() => {
    const title = draft.trim();
    if (!title) return;
    setDraft('');
    setTodos((prev) => [...prev, { id: generateId(), title, done: false }]);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [draft]);

  const toggleTodo = useCallback((id: string) => {
    setTodos((prev) =>
      prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
    );
    if (Platform.OS !== 'web') {
      Haptics.selectionAsync();
    }
  }, []);

  const removeTodo = useCallback((id: string) => {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, []);

  if (loading) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator size="large" color={palette.tint} />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}>
        <ThemedView style={styles.header}>
          <ThemedText type="title">Tasks</ThemedText>
          <ThemedText style={[styles.subline, { color: palette.icon }]}>
            {todos.filter((t) => !t.done).length} active
            {todos.length ? ` · ${todos.length} total` : ''}
          </ThemedText>
        </ThemedView>

        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled">
          {todos.length === 0 ? (
            <ThemedText style={[styles.empty, { color: palette.icon }]}>
              No tasks yet. Add one below.
            </ThemedText>
          ) : (
            todos.map((item) => (
              <ThemedView
                key={item.id}
                style={[
                  styles.row,
                  {
                    borderColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
                  },
                ]}>
                <Pressable
                  onPress={() => toggleTodo(item.id)}
                  style={styles.rowMain}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.done }}>
                  <View
                    style={[
                      styles.checkbox,
                      {
                        borderColor: palette.tint,
                        backgroundColor: item.done ? palette.tint : 'transparent',
                      },
                    ]}>
                    {item.done ? (
                      <ThemedText style={styles.checkMark}>✓</ThemedText>
                    ) : null}
                  </View>
                  <ThemedText
                    style={[
                      styles.taskTitle,
                      item.done && {
                        textDecorationLine: 'line-through',
                        opacity: 0.55,
                      },
                    ]}>
                    {item.title}
                  </ThemedText>
                </Pressable>
                <Pressable
                  onPress={() => removeTodo(item.id)}
                  hitSlop={12}
                  accessibilityLabel="Delete task"
                  style={styles.deleteBtn}>
                  <ThemedText style={{ color: '#ff3b30', fontWeight: '600' }}>
                    Delete
                  </ThemedText>
                </Pressable>
              </ThemedView>
            ))
          )}
        </ScrollView>

        <ThemedView
          style={[
            styles.inputBar,
            {
              borderTopColor: colorScheme === 'dark' ? '#2c2c2e' : '#e5e5ea',
              paddingBottom: 12 + insets.bottom,
            },
          ]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="New task…"
            placeholderTextColor={palette.icon}
            onSubmitEditing={addTodo}
            returnKeyType="done"
            style={[
              styles.input,
              {
                color: palette.text,
                backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7',
              },
            ]}
          />
          <Pressable
            onPress={addTodo}
            style={[
              styles.addBtn,
              { backgroundColor: palette.tint, opacity: draft.trim() ? 1 : 0.45 },
            ]}
            disabled={!draft.trim()}>
            <ThemedText style={styles.addBtnText}>Add</ThemedText>
          </Pressable>
        </ThemedView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  subline: {
    marginTop: 4,
    fontSize: 15,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  empty: {
    textAlign: 'center',
    marginTop: 32,
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    marginBottom: 10,
    overflow: 'hidden',
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingLeft: 14,
    gap: 12,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkMark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 16,
  },
  taskTitle: {
    flex: 1,
    fontSize: 17,
  },
  deleteBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: Platform.select({ ios: 12, default: 10 }),
    fontSize: 16,
  },
  addBtn: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
    opacity: 1,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});
