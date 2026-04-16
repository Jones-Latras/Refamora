import { useEffect, useMemo, useState } from 'react'
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

import { palette, radii, shadow } from '../utils/theme'
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

const pricePresets = [
  { label: 'Under PHP 1,000', minPrice: undefined, maxPrice: 1000 },
  { label: 'PHP 1,000–3,000', minPrice: 1000, maxPrice: 3000 },
  { label: 'PHP 3,000+', minPrice: 3000, maxPrice: undefined },
] as const

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

  const activeLabels = useMemo(() => {
    const labels: string[] = []

    if (draft.wasteType) {
      const match = WASTE_TYPES.find((type) => type.value === draft.wasteType)
      labels.push(match?.label ?? draft.wasteType)
    }

    if (draft.fulfillmentType) {
      const match = fulfillmentOptions.find(
        (option) => option.value === draft.fulfillmentType,
      )
      labels.push(match?.label ?? draft.fulfillmentType)
    }

    if (draft.minPrice != null || draft.maxPrice != null) {
      labels.push(
        `PHP ${draft.minPrice ?? 0} - ${draft.maxPrice ?? 'up'}`,
      )
    }

    return labels
  }, [draft.fulfillmentType, draft.maxPrice, draft.minPrice, draft.wasteType])

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
            <Text style={styles.title}>Filters</Text>
            <Pressable onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>Close</Text>
            </Pressable>
          </View>

          {activeLabels.length > 0 ? (
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Active filters</Text>
              <View style={styles.optionsWrap}>
                {activeLabels.map((label) => (
                  <View key={label} style={styles.summaryChip}>
                    <Text style={styles.summaryChipText}>{label}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

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
              <View style={styles.segmentRow}>
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
                        styles.segmentButton,
                        selected ? styles.segmentButtonActive : null,
                      ]}
                    >
                      <Text
                        style={[
                          styles.segmentButtonText,
                          selected ? styles.segmentButtonTextActive : null,
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
              <View style={styles.optionsWrap}>
                {pricePresets.map((preset) => {
                  const selected =
                    draft.minPrice === preset.minPrice &&
                    draft.maxPrice === preset.maxPrice

                  return (
                    <Pressable
                      key={preset.label}
                      onPress={() =>
                        setDraft((current) => ({
                          ...current,
                          minPrice: selected ? undefined : preset.minPrice,
                          maxPrice: selected ? undefined : preset.maxPrice,
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
                        {preset.label}
                      </Text>
                    </Pressable>
                  )
                })}
              </View>
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

          <View style={styles.footer}>
            <Pressable onPress={clearFilters} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Clear all</Text>
            </Pressable>
            <Pressable onPress={applyFilters} style={styles.applyButton}>
              <Text style={styles.applyButtonText}>Apply filters</Text>
            </Pressable>
          </View>
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
    maxHeight: '84%',
    gap: 18,
    ...shadow,
  },
  handle: {
    width: 52,
    height: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(28, 16, 10, 0.12)',
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
  closeButton: {
    paddingVertical: 4,
  },
  closeText: {
    color: palette.sageDark,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: palette.parchment,
    borderRadius: radii.md,
    padding: 14,
    gap: 10,
  },
  summaryTitle: {
    color: palette.soil,
    fontSize: 13,
    fontWeight: '700',
  },
  summaryChip: {
    borderRadius: 999,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: palette.border,
  },
  summaryChipText: {
    color: palette.clay,
    fontWeight: '700',
    fontSize: 12,
  },
  content: {
    gap: 22,
    paddingBottom: 8,
  },
  section: {
    gap: 12,
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
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
  },
  segmentButton: {
    flex: 1,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: 'center',
    paddingVertical: 12,
  },
  segmentButtonActive: {
    backgroundColor: palette.sage,
    borderColor: palette.sage,
  },
  segmentButtonText: {
    color: palette.clay,
    fontWeight: '700',
  },
  segmentButtonTextActive: {
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
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: palette.parchment,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  secondaryButtonText: {
    color: palette.clay,
    fontWeight: '800',
    fontSize: 15,
  },
  applyButton: {
    flex: 1.4,
    backgroundColor: palette.sage,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  applyButtonText: {
    color: palette.cream,
    fontWeight: '800',
    fontSize: 15,
  },
})
