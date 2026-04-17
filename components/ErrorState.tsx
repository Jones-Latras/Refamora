import { Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii, shadow } from '../utils/theme'

type ErrorStateProps = {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function ErrorState({
  title,
  description,
  actionLabel = 'Try again',
  onAction,
}: ErrorStateProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {onAction ? (
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
    borderColor: 'rgba(160, 69, 50, 0.15)',
    padding: 24,
    gap: 10,
    ...shadow,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
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
    backgroundColor: palette.error,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  buttonText: {
    color: palette.cream,
    fontWeight: '700',
  },
})
