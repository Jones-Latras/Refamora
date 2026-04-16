import { Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii, shadow } from '../utils/theme'

type EmptyStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.button}>
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 24,
    gap: 10,
    ...shadow,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: palette.soil,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    color: palette.muted,
  },
  button: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: palette.sage,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: palette.cream,
    fontWeight: '700',
  },
})
