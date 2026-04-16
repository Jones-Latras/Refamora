import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { useProfile } from '../../hooks/useProfile'
import { palette, radii, shadow } from '../../utils/theme'

export default function ProfileScreen() {
  const { user, role } = useAuth()
  const { profile } = useProfile(user?.id)

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {profile ? (
          <View style={styles.card}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(profile.full_name ?? user?.email ?? 'A').charAt(0).toUpperCase()}
              </Text>
            </View>
            <Text style={styles.name}>{profile.full_name ?? 'AgriWaste user'}</Text>
            <Text style={styles.meta}>{role ?? 'Role not set'}</Text>
            <View style={styles.details}>
              <Text style={styles.detailLine}>
                Email: {profile.email ?? user?.email ?? '—'}
              </Text>
              <Text style={styles.detailLine}>Phone: {profile.phone ?? '—'}</Text>
              <Text style={styles.detailLine}>City: {profile.city ?? '—'}</Text>
            </View>
          </View>
        ) : (
          <EmptyState
            title="Profile details are empty"
            description="Add your phone number and city to complete your account."
          />
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    padding: 24,
  },
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
    gap: 14,
    alignItems: 'center',
    ...shadow,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#dbe7de',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: palette.sageDark,
    fontSize: 30,
    fontWeight: '800',
  },
  name: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: palette.harvest,
    textTransform: 'capitalize',
    fontWeight: '700',
  },
  details: {
    alignSelf: 'stretch',
    backgroundColor: palette.parchment,
    borderRadius: radii.md,
    padding: 16,
    gap: 8,
  },
  detailLine: {
    color: palette.clay,
    lineHeight: 22,
  },
})
