import { Pressable, StyleSheet, Text, View } from 'react-native'

import { palette, radii } from '../utils/theme'

type InlineStatusNoticeProps = {
  title: string
  description: string
  tone?: 'warning' | 'error' | 'info'
  actionLabel?: string
  onAction?: () => void
}

const toneStyles = {
  warning: {
    borderColor: 'rgba(176, 126, 40, 0.18)',
    backgroundColor: '#fff7ea',
    titleColor: palette.soil,
    descriptionColor: palette.clay,
    buttonBackgroundColor: palette.harvest,
  },
  error: {
    borderColor: 'rgba(160, 69, 50, 0.16)',
    backgroundColor: '#fff2ef',
    titleColor: palette.soil,
    descriptionColor: palette.clay,
    buttonBackgroundColor: palette.error,
  },
  info: {
    borderColor: 'rgba(58, 102, 72, 0.12)',
    backgroundColor: '#eef6ed',
    titleColor: palette.soil,
    descriptionColor: palette.sageDark,
    buttonBackgroundColor: palette.sage,
  },
} as const

export function InlineStatusNotice({
  title,
  description,
  tone = 'warning',
  actionLabel,
  onAction,
}: InlineStatusNoticeProps) {
  const currentTone = toneStyles[tone]

  return (
    <View
      style={[
        styles.card,
        {
          borderColor: currentTone.borderColor,
          backgroundColor: currentTone.backgroundColor,
        },
      ]}
    >
      <View style={styles.textBlock}>
        <Text style={[styles.title, { color: currentTone.titleColor }]}>{title}</Text>
        <Text style={[styles.description, { color: currentTone.descriptionColor }]}>
          {description}
        </Text>
      </View>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={[styles.button, { backgroundColor: currentTone.buttonBackgroundColor }]}
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  textBlock: {
    gap: 4,
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
  },
  description: {
    fontSize: 12,
    lineHeight: 17,
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  buttonText: {
    color: palette.cream,
    fontSize: 12,
    fontWeight: '800',
  },
})
