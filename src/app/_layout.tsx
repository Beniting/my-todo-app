import React, { useEffect } from 'react';
import { Stack, DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { TodoProvider } from '@/context/TodoContext';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useEffect(() => {
    // Hide splash screen smoothly after mount
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch(() => {});
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  return (
    <ThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <TodoProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
            },
            headerTitleStyle: {
              fontWeight: '700',
              color: isDark ? '#FFFFFF' : '#111827',
            },
            headerTintColor: '#2563EB',
          }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="tasks/new"
            options={{
              presentation: 'modal',
              title: 'Create New Task',
              headerBackTitle: 'Cancel',
            }}
          />
          <Stack.Screen
            name="tasks/[id]"
            options={{
              title: 'Task Details',
              headerBackTitle: 'Back',
            }}
          />
        </Stack>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </TodoProvider>
    </ThemeProvider>
  );
}
