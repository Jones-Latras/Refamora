import { Image, Pressable, StyleSheet, Text, View } from 'react-native'

import type { ListingPreview } from '../types/app'

import { FulfillmentLabel } from './FulfillmentLabel'
import { formatDate, formatPrice } from '../utils/formatters'
import { palette, radii, shadow } from '../utils/theme'

type ListingCardProps = {
  listing: ListingPreview
  onPress?: () => void
}

export function ListingCard({ listing, onPress }: ListingCardProps) {
  return (
    <Pressable onPress={onPress} style={styles.card}>
      {listing.imageUrl ? (
        <Image source={{ uri: listing.imageUrl }} style={styles.image} />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageLabel}>{listing.wasteType}</Text>
        </View>
      )}
      <View style={styles.content}>
        <View style={styles.row}>
          <Text style={styles.title}>{listing.title}</Text>
          <View
            style={[
              styles.statusPill,
              listing.status === 'active'
                ? styles.statusActive
                : listing.status === 'sold'
                  ? styles.statusSold
                  : styles.statusPaused,
            ]}
          >
            <Text style={styles.statusText}>{listing.status}</Text>
          </View>
        </View>
        <Text style={styles.meta}>
          {listing.city} • {listing.quantity} {listing.unit}
        </Text>
        <Text style={styles.price}>{formatPrice(listing.price, listing.unit)}</Text>
        <View style={styles.footer}>
          <FulfillmentLabel type={listing.fulfillmentType} />
          <Text style={styles.footerText}>{formatDate(listing.createdAt)}</Text>
        </View>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    ...shadow,
  },
  imagePlaceholder: {
    height: 148,
    backgroundColor: '#eef1ee',
    alignItems: 'flex-start',
    justifyContent: 'flex-end',
    padding: 16,
  },
  image: {
    height: 148,
    width: '100%',
    backgroundColor: '#eef1ee',
  },
  imageLabel: {
    color: palette.soil,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: 16,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    alignItems: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: palette.soil,
  },
  meta: {
    color: palette.muted,
    fontSize: 14,
  },
  price: {
    color: palette.sageDark,
    fontSize: 18,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    color: palette.clay,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  statusActive: {
    backgroundColor: '#dbe7de',
  },
  statusSold: {
    backgroundColor: '#dedad4',
  },
  statusPaused: {
    backgroundColor: '#efe1c3',
  },
  statusText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
})
