import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import type { ListingDetail } from '../types/app'

import { FulfillmentLabel } from './FulfillmentLabel'
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
      <View style={styles.handle} />
      <View style={styles.row}>
        {listing.imageUrl ? (
          <Image source={{ uri: listing.imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>
              {titleCase(listing.wasteType.replace(/_/g, ' '))}
            </Text>
          </View>
        )}

        <View style={styles.main}>
          <View style={styles.header}>
            <Text style={styles.eyebrow}>
              {titleCase(listing.wasteType.replace(/_/g, ' '))}
            </Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          <Text numberOfLines={2} style={styles.title}>
            {listing.title}
          </Text>
          <Text style={styles.price}>{formatPrice(listing.price, listing.unit)}</Text>
          <Text style={styles.meta}>
            {listing.city} | {listing.quantity} {listing.unit}
          </Text>
          <View style={styles.footer}>
            <FulfillmentLabel type={listing.fulfillmentType} />
            <Text style={styles.sellerText}>
              {listing.seller?.fullName ?? 'Seller'}
            </Text>
          </View>
        </View>
      </View>

      <Pressable onPress={onViewDetails} style={styles.actionButton}>
        <Text style={styles.actionButtonText}>Open details</Text>
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 20,
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 16,
    gap: 14,
    ...shadow,
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 999,
    alignSelf: 'center',
    backgroundColor: 'rgba(28, 16, 10, 0.12)',
  },
  row: {
    flexDirection: 'row',
    gap: 14,
  },
  image: {
    width: 88,
    height: 96,
    borderRadius: radii.md,
    backgroundColor: '#eef1ee',
  },
  imageFallback: {
    width: 88,
    height: 96,
    borderRadius: radii.md,
    backgroundColor: '#eef1ee',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  imageFallbackText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  main: {
    flex: 1,
    gap: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  eyebrow: {
    color: palette.harvest,
    textTransform: 'uppercase',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  closeButton: {
    paddingVertical: 2,
  },
  closeText: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 12,
  },
  title: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 23,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  sellerText: {
    flex: 1,
    color: palette.clay,
    textAlign: 'right',
    fontWeight: '700',
  },
  actionButton: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionButtonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
})
