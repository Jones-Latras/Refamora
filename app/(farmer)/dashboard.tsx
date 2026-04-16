import { router } from 'expo-router'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { useAuth } from '../../hooks/useAuth'
import { signOut } from '../../services/authService'
import { palette, radii } from '../../utils/theme'

const metrics = [
  { label: 'Active Listings', value: '0' },
  { label: 'Sold', value: '0' },
  { label: 'New Inquiries', value: '0' },
]

export default function FarmerDashboardScreen() {
  const { user } = useAuth()

  const handleSignOut = async () => {
    await signOut()
    router.replace('/(auth)/login')
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroHeader}>
            <View>
              <Text style={styles.eyebrow}>Farmer tools</Text>
              <Text style={styles.title}>
                {user?.email ? `Welcome, ${user.email}` : 'Welcome back'}
              </Text>
            </View>
            <Pressable onPress={handleSignOut}>
              <Text style={styles.signOut}>Sign out</Text>
            </Pressable>
          </View>
          <Text style={styles.subtitle}>
            This route group is ready for the later listing, dashboard, and
            contact phases from the build plan.
          </Text>
        </View>

        <View style={styles.metricRow}>
          {metrics.map((metric) => (
            <View key={metric.label} style={styles.metricCard}>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => router.push('/(farmer)/create-listing')}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Create a Listing</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(farmer)/my-listings')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Manage Existing Listings</Text>
          </Pressable>
          <Pressable
            onPress={() => router.push('/(shared)/profile')}
            style={styles.secondaryButton}
          >
            <Text style={styles.secondaryButtonText}>Open My Profile</Text>
          </Pressable>
        </View>

        <EmptyState
          title="Your recent listings will appear here"
          description="Phase 9 calls for recent listings below the metrics. Once listing creation and retrieval are wired to Supabase, this section can render the most recent items."
        />
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
    gap: 24,
  },
  hero: {
    backgroundColor: palette.soil,
    borderRadius: radii.lg,
    padding: 24,
    gap: 12,
  },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    fontWeight: '700',
    fontSize: 11,
    letterSpacing: 1.5,
  },
  title: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 27,
    lineHeight: 33,
  },
  subtitle: {
    color: '#e8dfd1',
    lineHeight: 22,
  },
  signOut: {
    color: palette.harvest,
    fontWeight: '700',
  },
  metricRow: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 4,
  },
  metricValue: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 13,
  },
  actions: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  primaryButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
  secondaryButton: {
    backgroundColor: '#efe1c3',
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
  },
})
