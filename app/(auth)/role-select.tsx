import { router } from 'expo-router'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { setUserRole } from '../../services/profileService'
import type { UserRole } from '../../types/app'
import { palette, radii } from '../../utils/theme'

const roles: {
  id: UserRole
  title: string
  description: string
}[] = [
  {
    id: 'farmer',
    title: 'I am a farmer',
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

  const handleSelectRole = async (role: UserRole) => {
    if (!user) {
      showToast('Sign in before selecting a role.', 'error')
      return
    }

    const result = await setUserRole(user.id, role)

    if (result.error) {
      showToast(result.error.message, 'error')
      return
    }

    await refreshRole()
    showToast('Role saved successfully.', 'success')
    router.replace(role === 'farmer' ? '/(farmer)/dashboard' : '/(buyer)/feed')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.content}>
        <Text style={styles.eyebrow}>Phase 2</Text>
        <Text style={styles.title}>Choose the path you need today</Text>
        <Text style={styles.subtitle}>
          The app uses this role to decide which route group becomes your home
          after login.
        </Text>

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
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    fontWeight: '700',
    letterSpacing: 1.4,
    fontSize: 11,
  },
  title: {
    color: palette.soil,
    fontWeight: '800',
    fontSize: 30,
    lineHeight: 36,
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 22,
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
