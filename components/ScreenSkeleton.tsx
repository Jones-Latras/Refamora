import { ScrollView, StyleSheet, View } from 'react-native'

import { palette, radii, shadow } from '../utils/theme'
import { SkeletonCard } from './SkeletonCard'

type LineProps = {
  width: number | `${number}%`
  height?: number
}

function SkeletonLine({ width, height = 12 }: LineProps) {
  return <View style={[styles.line, { width, height }]} />
}

function SkeletonCardBlock() {
  return (
    <View style={styles.card}>
      <SkeletonLine width="42%" height={18} />
      <SkeletonLine width="100%" />
      <SkeletonLine width="78%" />
    </View>
  )
}

export function DashboardScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.dashboardContent}>
      <View style={styles.dashboardTipCard}>
        <SkeletonLine width="52%" height={18} />
        <SkeletonLine width="100%" />
        <SkeletonLine width="88%" />
        <SkeletonLine width="44%" height={36} />
      </View>

      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.dashboardSection}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionHeaderText}>
              <SkeletonLine width="58%" height={20} />
              <SkeletonLine width="42%" />
            </View>
            <SkeletonLine width={84} height={14} />
          </View>
          <View style={styles.stack}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

export function ProfileScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.profileContent}>
      <View style={styles.cover} />
      <View style={styles.profileHeader}>
        <View style={styles.avatar} />
        <View style={styles.profileText}>
          <SkeletonLine width={180} height={24} />
          <SkeletonLine width={160} />
          <SkeletonLine width={140} />
        </View>
        <View style={styles.completionCard}>
          <SkeletonLine width="38%" height={16} />
          <SkeletonLine width="100%" />
          <SkeletonLine width="86%" />
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
          <SkeletonLine width="62%" />
        </View>
      </View>

      <SkeletonCardBlock />
      <SkeletonCardBlock />
      <SkeletonCardBlock />
    </ScrollView>
  )
}

export function ListingDetailScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.listingContent}>
      <SkeletonLine width={72} height={40} />
      <View style={styles.heroImage} />

      <View style={styles.listingHeroText}>
        <SkeletonLine width="24%" />
        <SkeletonLine width="86%" height={30} />
        <SkeletonLine width="40%" height={24} />
        <View style={styles.badgeRow}>
          <SkeletonLine width={120} height={28} />
          <SkeletonLine width={80} height={28} />
          <SkeletonLine width={92} height={28} />
        </View>
        <SkeletonLine width="72%" />
      </View>

      <SkeletonCardBlock />
      <SkeletonCardBlock />
      <View style={styles.card}>
        <View style={styles.sellerRow}>
          <View style={styles.avatarSmall} />
          <View style={styles.sectionHeaderText}>
            <SkeletonLine width={150} height={16} />
            <SkeletonLine width={120} />
          </View>
        </View>
        <View style={styles.trustGrid}>
          <View style={styles.trustCard} />
          <View style={styles.trustCard} />
          <View style={styles.trustCard} />
        </View>
      </View>
    </ScrollView>
  )
}

export function RequestsScreenSkeleton() {
  return (
    <ScrollView contentContainerStyle={styles.requestsContent}>
      <View style={styles.headerCard}>
        <SkeletonLine width="44%" height={18} />
        <SkeletonLine width="100%" />
        <SkeletonLine width="90%" />
        <View style={styles.actionRow}>
          <SkeletonLine width="48%" height={42} />
          <SkeletonLine width="44%" height={42} />
        </View>
      </View>

      {[0, 1].map((item) => (
        <View key={item} style={styles.groupCard}>
          <View style={styles.groupHeader}>
            <View style={styles.sectionHeaderText}>
              <SkeletonLine width={170} height={16} />
              <SkeletonLine width={150} />
            </View>
            <SkeletonLine width={90} height={34} />
          </View>
          <View style={styles.stack}>
            <SkeletonCard />
            <SkeletonCard />
          </View>
        </View>
      ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  line: {
    borderRadius: 999,
    backgroundColor: '#e8ece7',
  },
  card: {
    marginHorizontal: 24,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 12,
    ...shadow,
  },
  stack: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    gap: 8,
  },
  dashboardContent: {
    padding: 24,
    gap: 18,
  },
  dashboardTipCard: {
    backgroundColor: '#f3f7f2',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 10,
  },
  dashboardSection: {
    gap: 14,
  },
  profileContent: {
    paddingBottom: 32,
    gap: 16,
  },
  cover: {
    height: 118,
    backgroundColor: '#eef2ed',
  },
  profileHeader: {
    marginTop: -44,
    paddingHorizontal: 24,
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: palette.cream,
    backgroundColor: '#e8ece7',
  },
  avatarSmall: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#e8ece7',
  },
  profileText: {
    alignItems: 'center',
    gap: 8,
  },
  completionCard: {
    width: '100%',
    backgroundColor: '#f7faf7',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 10,
  },
  progressTrack: {
    width: '100%',
    height: 8,
    borderRadius: 999,
    backgroundColor: '#e6ece5',
    overflow: 'hidden',
  },
  progressFill: {
    width: '58%',
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#d6e4d8',
  },
  listingContent: {
    padding: 20,
    gap: 16,
  },
  heroImage: {
    width: '100%',
    height: 240,
    borderRadius: radii.lg,
    backgroundColor: '#e8ece7',
  },
  listingHeroText: {
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  trustGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  trustCard: {
    flex: 1,
    height: 88,
    borderRadius: radii.md,
    backgroundColor: '#f1f4f0',
    borderWidth: 1,
    borderColor: palette.border,
  },
  requestsContent: {
    padding: 24,
    gap: 16,
  },
  headerCard: {
    backgroundColor: '#eef6ed',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'rgba(58, 102, 72, 0.12)',
    padding: 16,
    gap: 12,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  groupCard: {
    gap: 12,
    backgroundColor: '#f7faf6',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
})
