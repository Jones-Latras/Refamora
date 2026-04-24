import { useEffect, useMemo, useState } from 'react'
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useAuth } from '../../hooks/useAuth'
import { getMarketplaceAnalyticsSummary } from '../../services/marketplaceAnalyticsService'
import type {
  MarketplaceAnalyticsBreakdownItem,
  MarketplaceAnalyticsSummary,
} from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'

type MetricCardProps = {
  label: string
  value: string
  hint?: string
}

function MetricCard({ label, value, hint }: MetricCardProps) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
      {hint ? <Text style={styles.metricHint}>{hint}</Text> : null}
    </View>
  )
}

function BreakdownCard(input: {
  title: string
  emptyText: string
  items: MarketplaceAnalyticsBreakdownItem[]
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{input.title}</Text>
      {input.items.length > 0 ? (
        <View style={styles.breakdownList}>
          {input.items.map((item) => (
            <View key={item.label} style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>{item.label}</Text>
              <Text style={styles.breakdownCount}>{item.count}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>{input.emptyText}</Text>
      )}
    </View>
  )
}

export default function AdminAnalyticsScreen() {
  const { role } = useAuth()
  const [summary, setSummary] = useState<MarketplaceAnalyticsSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadAnalytics = async (mode: 'initial' | 'refresh' = 'initial') => {
    if (role !== 'admin') {
      setIsLoading(false)
      return
    }

    if (mode === 'refresh') {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const result = await getMarketplaceAnalyticsSummary()

    if (result.error) {
      setErrorMessage(result.error.message)
    } else {
      setSummary(result.data)
      setErrorMessage(null)
    }

    setIsLoading(false)
    setIsRefreshing(false)
  }

  useEffect(() => {
    void loadAnalytics()
  }, [role])

  const verifiedSellerRate = useMemo(() => {
    if (!summary || summary.totalFarmers <= 0) {
      return null
    }

    return Math.round((summary.verifiedSellerCount / summary.totalFarmers) * 100)
  }, [summary])

  if (role !== 'admin') {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <EmptyState
            title="Admin access required"
            description="This analytics screen is only available to accounts with the admin role."
          />
        </View>
      </SafeAreaView>
    )
  }

  if (errorMessage && !isLoading && !summary) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.stateWrap}>
          <ErrorState
            title="Analytics unavailable"
            description={errorMessage}
            onAction={() => {
              void loadAnalytics()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            tintColor={palette.sageDark}
            onRefresh={() => {
              void loadAnalytics('refresh')
            }}
          />
        }
      >
        <View style={styles.hero}>
          <Text style={styles.title}>Marketplace analytics</Text>
          <Text style={styles.subtitle}>
            Marketplace activity summary for the last {summary?.periodDays ?? 7} days where
            applicable, using current users, listings, views, and inquiry records.
          </Text>
        </View>

        {isLoading && !summary ? (
          <View style={styles.sectionCard}>
            <Text style={styles.emptyText}>Loading marketplace analytics...</Text>
          </View>
        ) : summary ? (
          <>
            <View style={styles.metricsRow}>
              <MetricCard label="Total users" value={summary.totalUsers.toString()} />
              <MetricCard label="Farmers" value={summary.totalFarmers.toString()} />
              <MetricCard label="Buyers" value={summary.totalBuyers.toString()} />
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Active listings" value={summary.activeListings.toString()} />
              <MetricCard label="Sold listings" value={summary.soldListings.toString()} />
              <MetricCard
                label="Verified sellers"
                value={summary.verifiedSellerCount.toString()}
                hint={
                  verifiedSellerRate != null
                    ? `${verifiedSellerRate}% of farmers`
                    : 'No farmer profiles yet'
                }
              />
            </View>

            <View style={styles.metricsRow}>
              <MetricCard label="Listing views" value={summary.totalListingViews.toString()} />
              <MetricCard label="Inquiries" value={summary.totalInquiries.toString()} />
              <MetricCard
                label="Responded"
                value={summary.respondedInquiries.toString()}
                hint={
                  summary.sellerResponseRate != null
                    ? `${summary.sellerResponseRate}% response rate`
                    : 'No inquiries yet'
                }
              />
            </View>

            <View style={styles.sectionCard}>
              <Text style={styles.sectionTitle}>Recent marketplace movement</Text>
              <View style={styles.breakdownList}>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Recent sign-ups</Text>
                  <Text style={styles.breakdownCount}>{summary.recentSignUps}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Recent listings</Text>
                  <Text style={styles.breakdownCount}>{summary.recentListings}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Recent inquiries</Text>
                  <Text style={styles.breakdownCount}>{summary.recentInquiries}</Text>
                </View>
                <View style={styles.breakdownRow}>
                  <Text style={styles.breakdownLabel}>Inquiry conversion</Text>
                  <Text style={styles.breakdownCount}>
                    {summary.inquiryConversionRate != null
                      ? `${summary.inquiryConversionRate}%`
                      : 'N/A'}
                  </Text>
                </View>
              </View>
            </View>

            <BreakdownCard
              title="Top active waste types"
              emptyText="No active listings are available yet."
              items={summary.topWasteTypes}
            />

            <BreakdownCard
              title="Top active listing cities"
              emptyText="No active listing cities are available yet."
              items={summary.topCities}
            />
          </>
        ) : null}
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
    padding: 20,
    gap: 16,
  },
  stateWrap: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  hero: {
    gap: 6,
  },
  title: {
    color: palette.soil,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '900',
  },
  subtitle: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 22,
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    gap: 4,
    ...shadow,
  },
  metricValue: {
    color: palette.soil,
    fontSize: 24,
    fontWeight: '800',
  },
  metricLabel: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  metricHint: {
    color: palette.sageDark,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 12,
    ...shadow,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  breakdownList: {
    gap: 10,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  breakdownLabel: {
    flex: 1,
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  breakdownCount: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
})
