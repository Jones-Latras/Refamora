import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'

import { palette, radii, shadow } from '../utils/theme'

type InquiryAiModalProps = {
  isVisible: boolean
  title: string
  subtitle: string
  body: string
  bullets?: string[]
  editable?: boolean
  onChangeBody?: (value: string) => void
  onClose: () => void
}

export function InquiryAiModal({
  isVisible,
  title,
  subtitle,
  body,
  bullets = [],
  editable = false,
  onChangeBody,
  onClose,
}: InquiryAiModalProps) {
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
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <ScrollView contentContainerStyle={styles.content}>
            {editable ? (
              <TextInput
                multiline
                numberOfLines={8}
                placeholder="AI draft will appear here."
                placeholderTextColor="#9c8c79"
                style={styles.input}
                textAlignVertical="top"
                value={body}
                onChangeText={onChangeBody}
              />
            ) : (
              <View style={styles.bodyCard}>
                <Text style={styles.bodyText}>{body}</Text>
              </View>
            )}

            {bullets.length > 0 ? (
              <View style={styles.listBlock}>
                <Text style={styles.listTitle}>Highlights</Text>
                {bullets.map((item) => (
                  <Text key={item} style={styles.listItem}>
                    - {item}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <Pressable onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>Done</Text>
          </Pressable>
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
    maxHeight: '82%',
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
  content: {
    gap: 14,
  },
  bodyCard: {
    backgroundColor: '#fffcf6',
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bodyText: {
    color: palette.ink,
    lineHeight: 22,
  },
  input: {
    minHeight: 160,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: palette.ink,
    backgroundColor: '#fffcf6',
  },
  listBlock: {
    gap: 6,
  },
  listTitle: {
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  listItem: {
    color: palette.muted,
    lineHeight: 20,
  },
  closeButton: {
    minHeight: 48,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.sage,
  },
  closeButtonText: {
    color: palette.cream,
    fontWeight: '800',
  },
})
