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

type ContactSellerModalProps = {
  isVisible: boolean
  message: string
  isSubmitting: boolean
  onChangeMessage: (value: string) => void
  onClose: () => void
  onSubmit: () => void
}

export function ContactSellerModal({
  isVisible,
  message,
  isSubmitting,
  onChangeMessage,
  onClose,
  onSubmit,
}: ContactSellerModalProps) {
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
          <Text style={styles.title}>Contact seller</Text>
          <Text style={styles.subtitle}>
            Add an optional note so the seller knows what you need.
          </Text>

          <TextInput
            multiline
            numberOfLines={4}
            editable={!isSubmitting}
            placeholder="Hi, is this still available? I can pick up this week."
            placeholderTextColor="#9c8c79"
            style={styles.input}
            textAlignVertical="top"
            value={message}
            onChangeText={onChangeMessage}
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
                <Text style={styles.primaryText}>Send request</Text>
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
    backgroundColor: palette.sage,
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
