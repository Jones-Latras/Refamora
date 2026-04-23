import { Redirect } from 'expo-router'

import { useAuth } from '../hooks/useAuth'

export default function IndexScreen() {
  const { user, role, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />
  }

  if (!role) {
    return <Redirect href="/(auth)/role-select" />
  }

  return (
    <Redirect
      href={
        role === 'admin'
          ? '/(admin)/dashboard'
          : role === 'farmer'
            ? '/(farmer)/dashboard'
            : '/(buyer)/feed'
      }
    />
  )
}
