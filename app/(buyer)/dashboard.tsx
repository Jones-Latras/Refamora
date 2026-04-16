import { router } from 'expo-router'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { palette, radii } from '../../utils/theme'

export default function BuyerDashboardScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Text style={styles.title}>Buyer dashboard</Text>
          <Text style={styles.subtitle}>
            This screen is ready for the later recently-viewed and sent-contact
            sections from Phase 9.
          </Text>
        </View>

        <EmptyState
          title="No recently viewed listings yet"
          description="Once a buyer opens listing details, the next phase can store those IDs in Zustand and show them here."
          actionLabel="Browse the feed"
          onAction={() => router.push('/(buyer)/feed')}
        />

        <EmptyState
          title="No contact requests sent"
          description="The contact flow is still ahead in the build plan, so this placeholder keeps the dashboard honest without blocking the overall route structure."
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
    gap: 18,
  },
  hero: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
    gap: 8,
  },
  title: {
    color: palette.soil,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 22,
  },
})
