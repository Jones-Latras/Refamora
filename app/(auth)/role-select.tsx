import { router, useLocalSearchParams } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import type { User } from '@supabase/supabase-js'

import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { initializeUserProfile } from '../../services/profileService'
import type { UserRole } from '../../types/app'
import { palette, radii } from '../../utils/theme'

const roles: {
  id: UserRole
  title: string
  description: string
}[] = [
  {
    id: 'farmer',
    title: 'I am a seller',
    description: 'Post agricultural waste, manage listings, and respond to buyers.',
  },
  {
    id: 'buyer',
    title: 'I am a buyer',
    description: 'Browse listings, compare locations, and contact sellers directly.',
  },
]

export default function RoleSelectScreen() {
  const { user, refreshRole } = useAuth()
  const { showToast } = useToast()
  const params = useLocalSearchParams<{ redirect?: string }>()
  const redirect = typeof params.redirect === 'string' ? params.redirect : null

  const buildProfileFromUser = (authUser: User, role: UserRole) => {
    const metadata = authUser.user_metadata ?? {}
    const rawFullName =
      typeof metadata.full_name === 'string' ? metadata.full_name.trim() : ''
    const rawPhone =
      typeof metadata.phone === 'string' ? metadata.phone.trim() : ''

    return {
      id: authUser.id,
      email: authUser.email ?? null,
      full_name:
        rawFullName || authUser.email?.split('@')[0] || `user-${authUser.id.slice(0, 8)}`,
      phone: rawPhone || null,
      role,
    }
  }

  const handleSelectRole = async (role: UserRole) => {
    if (!user) {
      showToast('Sign in before selecting a role.', 'error')
      return
    }

    const result = await initializeUserProfile(buildProfileFromUser(user, role))

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    await refreshRole()
    showToast('Role saved successfully.', 'success')
    router.replace(
      redirect ?? (role === 'farmer' ? '/(farmer)/dashboard' : '/(buyer)/feed'),
    )
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.title}>Choose your account type</Text>

        {roles.map((role) => (
          <Pressable
            key={role.id}
            onPress={() => handleSelectRole(role.id)}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>{role.title}</Text>
            <Text style={styles.cardText}>{role.description}</Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    flex: 1,
    padding: 24,
    gap: 18,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 32,
    lineHeight: 38,
    paddingTop: 24,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 22,
    gap: 10,
  },
  cardTitle: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 20,
  },
  cardText: {
    color: palette.muted,
    lineHeight: 22,
  },
})
