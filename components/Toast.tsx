import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { palette, radii, shadow } from '../utils/theme'

type ToastVariant = 'success' | 'error' | 'info'

type ToastInput =
  | string
  | {
      title?: string
      message: string
      variant?: ToastVariant
      durationMs?: number
    }

type ToastState = {
  id: number
  title?: string
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (input: ToastInput, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const TAB_BAR_CLEARANCE = 84

const variantStyles: Record<ToastVariant, { backgroundColor: string }> = {
  success: { backgroundColor: palette.sage },
  error: { backgroundColor: palette.error },
  info: { backgroundColor: palette.harvest },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const insets = useSafeAreaInsets()

  const value = useMemo(
    () => ({
      showToast: (input: ToastInput, variant: ToastVariant = 'info') => {
        const nextPayload =
          typeof input === 'string'
            ? {
                title: undefined,
                message: input,
                variant,
                durationMs: 3000,
              }
            : {
                title: input.title,
                message: input.message,
                variant: input.variant ?? 'info',
                durationMs: input.durationMs ?? 3200,
              }

        const nextToast = {
          id: Date.now(),
          title: nextPayload.title,
          message: nextPayload.message,
          variant: nextPayload.variant,
        }

        setToast(nextToast)

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          setToast((currentToast) =>
            currentToast?.id === nextToast.id ? null : currentToast,
          )
        }, nextPayload.durationMs)
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View
          pointerEvents="none"
          style={[
            styles.viewport,
            { bottom: Math.max(insets.bottom + TAB_BAR_CLEARANCE, 28) },
          ]}
        >
          <View style={[styles.toast, variantStyles[toast.variant]]}>
            {toast.title ? <Text style={styles.toastTitle}>{toast.title}</Text> : null}
            <Text style={styles.toastText}>{toast.message}</Text>
          </View>
        </View>
      ) : null}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)

  if (!context) {
    throw new Error('useToast must be used inside ToastProvider.')
  }

  return context
}

const styles = StyleSheet.create({
  viewport: {
    position: 'absolute',
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.md,
    gap: 3,
    ...shadow,
  },
  toastTitle: {
    color: palette.cream,
    fontSize: 14,
    fontWeight: '800',
  },
  toastText: {
    color: palette.cream,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
})
