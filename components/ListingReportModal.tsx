import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { palette, radii, shadow } from '../utils/theme'

type ListingReportReason =
  | 'inaccurate_details'
  | 'suspicious_listing'
  | 'wrong_photo'
  | 'spam'
  | 'other'

type ListingReportModalProps = {
  isVisible: boolean
  selectedReason: ListingReportReason
  details: string
  isSubmitting: boolean
  onSelectReason: (value: ListingReportReason) => void
  onChangeDetails: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}

const reasons: { value: ListingReportReason; label: string }[] = [
  { value: 'inaccurate_details', label: 'Inaccurate details' },
  { value: 'suspicious_listing', label: 'Suspicious listing' },
  { value: 'wrong_photo', label: 'Wrong or misleading photo' },
  { value: 'spam', label: 'Spam or off-topic' },
  { value: 'other', label: 'Other concern' },
]

export function ListingReportModal({
  isVisible,
  selectedReason,
  details,
  isSubmitting,
  onSelectReason,
  onChangeDetails,
  onClose,
  onSubmit,
}: ListingReportModalProps) {
  return (
    <Modal
      animationType="slide"
      transparent
      visible={isVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          <Text style={styles.title}>Report this listing</Text>
          <Text style={styles.subtitle}>
            Tell us what looks wrong so Refamora can review it more carefully.
          </Text>

          <View style={styles.reasonGroup}>
            {reasons.map((reason) => (
              <Pressable
                key={reason.value}
                disabled={isSubmitting}
                onPress={() => onSelectReason(reason.value)}
                style={[
                  styles.reasonChip,
                  selectedReason === reason.value ? styles.reasonChipActive : null,
                ]}
              >
                <Text
                  style={[
                    styles.reasonChipText,
                    selectedReason === reason.value ? styles.reasonChipTextActive : null,
                  ]}
                >
                  {reason.label}
                </Text>
              </Pressable>
            ))}
          </View>

          <TextInput
            multiline
            numberOfLines={4}
            editable={!isSubmitting}
            placeholder="Add a short note if you want to explain what looks wrong."
            placeholderTextColor="#9c8c79"
            style={styles.input}
            textAlignVertical="top"
            value={details}
            onChangeText={onChangeDetails}
          />

          <View style={styles.actions}>
            <Pressable
              disabled={isSubmitting}
              onPress={onClose}
              style={[styles.button, styles.secondaryButton]}
            >
              <Text style={styles.secondaryText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={isSubmitting}
              onPress={onSubmit}
              style={[styles.button, styles.primaryButton]}
            >
              {isSubmitting ? (
                <ActivityIndicator color={palette.cream} size="small" />
              ) : (
                <Text style={styles.primaryText}>Submit report</Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(28, 16, 10, 0.42)',
  },
  sheet: {
    backgroundColor: palette.surface,
    borderTopLeftRadius: radii.lg,
    borderTopRightRadius: radii.lg,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 28,
    gap: 14,
    ...shadow,
  },
  title: {
    color: palette.soil,
    fontSize: 20,
    fontWeight: '800',
  },
  subtitle: {
    color: palette.muted,
    lineHeight: 20,
  },
  reasonGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  reasonChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  reasonChipActive: {
    backgroundColor: '#eef5ef',
    borderColor: 'rgba(58, 102, 72, 0.2)',
  },
  reasonChipText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
  reasonChipTextActive: {
    color: palette.sageDark,
  },
  input: {
    minHeight: 112,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.ink,
    backgroundColor: '#fffcf6',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    backgroundColor: '#efe7da',
  },
  primaryButton: {
    backgroundColor: palette.error,
  },
  secondaryText: {
    color: palette.soil,
    fontWeight: '700',
  },
  primaryText: {
    color: palette.cream,
    fontWeight: '700',
  },
})
