import { forwardRef } from 'react'
import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  type ReturnKeyTypeOptions,
  View,
} from 'react-native'

import { palette, radii } from '../utils/theme'

type FormFieldProps = {
  label: string
  value: string
  onChangeText: (value: string) => void
  placeholder?: string
  secureTextEntry?: boolean
  multiline?: boolean
  keyboardType?: 'default' | 'email-address' | 'number-pad' | 'phone-pad'
  error?: string
  helperText?: string
  actionLabel?: string
  onActionPress?: () => void
  returnKeyType?: ReturnKeyTypeOptions
  onSubmitEditing?: () => void
  blurOnSubmit?: boolean
}

export const FormField = forwardRef<TextInput, FormFieldProps>(function FormField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  multiline,
  keyboardType = 'default',
  error,
  helperText,
  actionLabel,
  onActionPress,
  returnKeyType,
  onSubmitEditing,
  blurOnSubmit,
}, ref) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {actionLabel && onActionPress ? (
          <Pressable onPress={onActionPress}>
            <Text style={styles.actionText}>{actionLabel}</Text>
          </Pressable>
        ) : null}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#9e9183"
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        blurOnSubmit={blurOnSubmit}
        style={[
          styles.input,
          multiline ? styles.multiline : null,
          error ? styles.inputError : null,
        ]}
      />
      {helperText && !error ? <Text style={styles.helper}>{helperText}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  )
})

const styles = StyleSheet.create({
  wrapper: {
    gap: 6,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
  },
  label: {
    color: palette.soil,
    fontWeight: '700',
    fontSize: 13,
  },
  actionText: {
    color: palette.sageDark,
    fontWeight: '700',
    fontSize: 12,
  },
  input: {
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: palette.ink,
  },
  multiline: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  inputError: {
    borderColor: palette.error,
  },
  helper: {
    color: palette.muted,
    fontSize: 12,
    lineHeight: 16,
  },
  error: {
    color: palette.error,
    fontSize: 12,
  },
})
