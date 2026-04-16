import { useEffect, useState } from 'react'
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import type { FulfillmentType, ListingFilters } from '../types/app'

import { palette, radii } from '../utils/theme'
import { WASTE_TYPES } from '../utils/wasteTypes'

type FeedFilterSheetProps = {
  open: boolean
  filters: ListingFilters
  onClose: () => void
  onApply: (filters: ListingFilters) => void
}

const fulfillmentOptions: {
  value: FulfillmentType
  label: string
}[] = [
  { value: 'pickup', label: 'Pickup' },
  { value: 'delivery', label: 'Delivery' },
  { value: 'both', label: 'Both' },
]

export function FeedFilterSheet({
  open,
  filters,
  onClose,
  onApply,
}: FeedFilterSheetProps) {
  const [draft, setDraft] = useState<ListingFilters>(filters)

  useEffect(() => {
    if (open) {
      setDraft(filters)
    }
  }, [filters, open])

  const applyFilters = () => {
    const cleaned: ListingFilters = {
      wasteType: draft.wasteType || undefined,
      fulfillmentType: draft.fulfillmentType || undefined,
      minPrice: draft.minPrice,
      maxPrice: draft.maxPrice,
    }

    onApply(cleaned)
    onClose()
  }

  const clearFilters = () => {
    const nextFilters = {}
    setDraft(nextFilters)
    onApply(nextFilters)
    onClose()
  }

  return (
    <Modal
      animationType="slide"
      transparent
      visible={open}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.backdropTap} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title}>Filter listings</Text>
            <Pressable onPress={clearFilters}>
              <Text style={styles.clearText}>Clear</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Waste type</Text>
              <View style={styles.optionsWrap}>
                {WASTE_TYPES.map((type) => {
                  const selected = draft.wasteType === type.value

                  return (
                    <Pressable
                      key={type.value}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          wasteType:
                            current.wasteType === type.value
                              ? undefined
                              : type.value,
                        }))
                      }
                      style={[
                        styles.optionChip,
                        selected ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selected ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {type.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fulfillment</Text>
              <View style={styles.optionsWrap}>
                {fulfillmentOptions.map((option) => {
                  const selected = draft.fulfillmentType === option.value

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          fulfillmentType:
                            current.fulfillmentType === option.value
                              ? undefined
                              : option.value,
                        }))
                      }
                      style={[
                        styles.optionChip,
                        selected ? styles.optionChipActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.optionChipText,
                          selected ? styles.optionChipTextActive : null,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Price range</Text>
              <View style={styles.priceRow}>
                <View style={styles.priceField}>
                  <Text style={styles.fieldLabel}>Min</Text>
                  <TextInput
                    value={draft.minPrice != null ? String(draft.minPrice) : ''}
                    onChangeText={(value) =>
                      setDraft((current) => ({
                        ...current,
                        minPrice:
                          value.trim() === '' ? undefined : Number(value),
                      }))
                    }
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#9e9183"
                    style={styles.input}
                  />
                </View>
                <View style={styles.priceField}>
                  <Text style={styles.fieldLabel}>Max</Text>
                  <TextInput
                    value={draft.maxPrice != null ? String(draft.maxPrice) : ''}
                    onChangeText={(value) =>
                      setDraft((current) => ({
                        ...current,
                        maxPrice:
                          value.trim() === '' ? undefined : Number(value),
                      }))
                    }
                    keyboardType="number-pad"
                    placeholder="5000"
                    placeholderTextColor="#9e9183"
                    style={styles.input}
                  />
                </View>
              </View>
            </View>
          </ScrollView>

          <Pressable onPress={applyFilters} style={styles.applyButton}>
            <Text style={styles.applyButtonText}>Apply filters</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 16, 10, 0.35)',
    justifyContent: 'flex-end',
  },
  backdropTap: {
    flex: 1,
  },
  sheet: {
    backgroundColor: palette.cream,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 28,
    maxHeight: '82%',
    gap: 18,
  },
  handle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(92, 56, 32, 0.2)',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: palette.soil,
    fontSize: 22,
    fontWeight: '800',
  },
  clearText: {
    color: palette.sageDark,
    fontWeight: '700',
  },
  content: {
    gap: 20,
    paddingBottom: 8,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: palette.soil,
    fontSize: 15,
    fontWeight: '700',
  },
  optionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  optionChip: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  optionChipActive: {
    backgroundColor: palette.sage,
    borderColor: palette.sage,
  },
  optionChipText: {
    color: palette.clay,
    fontWeight: '700',
    fontSize: 13,
  },
  optionChipTextActive: {
    color: palette.cream,
  },
  priceRow: {
    flexDirection: 'row',
    gap: 12,
  },
  priceField: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: palette.ink,
  },
  applyButton: {
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    paddingVertical: 16,
  },
  applyButtonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
})
