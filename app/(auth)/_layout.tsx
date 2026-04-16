import { Stack } from 'expo-router'

import { palette } from '../../utils/theme'

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerShadowVisible: false,
        headerStyle: { backgroundColor: palette.cream },
        headerTintColor: palette.soil,
        headerTitleStyle: { fontWeight: '700' },
        contentStyle: { backgroundColor: palette.cream },
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Welcome back' }} />
      <Stack.Screen name="signup" options={{ title: 'Create account' }} />
      <Stack.Screen name="role-select" options={{ title: 'Choose your role' }} />
    </Stack>
  )
}
