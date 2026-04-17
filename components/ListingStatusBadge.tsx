import { StyleSheet, Text, View } from 'react-native'

import { palette } from '../utils/theme'

type ListingDisplayStatus = 'active' | 'sold' | 'unavailable' | 'draft'

type ListingStatusBadgeProps = {
  status: ListingDisplayStatus
}

const statusLabel: Record<ListingDisplayStatus, string> = {
  active: 'Active',
  sold: 'Sold',
  unavailable: 'Unavailable',
  draft: 'Draft',
}

export function ListingStatusBadge({ status }: ListingStatusBadgeProps) {
  return (
    <View
      style={[
        styles.badge,
        status === 'active'
          ? styles.active
          : status === 'sold'
            ? styles.sold
            : status === 'draft'
              ? styles.draft
              : styles.unavailable,
      ]}
    >
      <Text style={styles.text}>{statusLabel[status]}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  active: {
    backgroundColor: '#dcebdc',
  },
  sold: {
    backgroundColor: '#e8e8e8',
  },
  unavailable: {
    backgroundColor: '#f3ead1',
  },
  draft: {
    backgroundColor: '#e5eef8',
  },
  text: {
    color: palette.soil,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
})
