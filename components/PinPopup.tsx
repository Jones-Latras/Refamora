import { Pressable, StyleSheet, Text, View } from 'react-native'

import type { ListingDetail } from '../types/app'

import { formatPrice, titleCase } from '../utils/formatters'
import { palette, radii, shadow } from '../utils/theme'

type PinPopupProps = {
  listing: ListingDetail
  onClose: () => void
  onViewDetails: () => void
}

export function PinPopup({
  listing,
  onClose,
  onViewDetails,
}: PinPopupProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.eyebrow}>{titleCase(listing.wasteType)}</Text>
          <Text numberOfLines={2} style={styles.title}>
            {listing.title}
          </Text>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeText}>Close</Text>
        </Pressable>
      </View>

      <Text style={styles.price}>{formatPrice(listing.price, listing.unit)}</Text>
      <Text style={styles.meta}>
        {listing.city} | {listing.quantity} {listing.unit}
      </Text>
      <Text style={styles.meta}>
        {listing.fulfillmentType} | status: {listing.status}
      </Text>

      <Pressable onPress={onViewDetails} style={styles.actionButton}>
        <Text style={styles.actionButtonText}>View Details</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 18,
    gap: 8,
    ...shadow,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  title: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  closeButton: {
    alignSelf: 'flex-start',
  },
  closeText: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 12,
  },
  price: {
    color: palette.sageDark,
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: palette.muted,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 6,
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
})
