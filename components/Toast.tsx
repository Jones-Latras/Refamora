import {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { StyleSheet, Text, View } from 'react-native'

import { palette, radii, shadow } from '../utils/theme'

type ToastVariant = 'success' | 'error' | 'info'

type ToastState = {
  id: number
  message: string
  variant: ToastVariant
}

type ToastContextValue = {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const variantStyles: Record<ToastVariant, { backgroundColor: string }> = {
  success: { backgroundColor: palette.sage },
  error: { backgroundColor: palette.error },
  info: { backgroundColor: palette.harvest },
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const value = useMemo(
    () => ({
      showToast: (message: string, variant: ToastVariant = 'info') => {
        const nextToast = {
          id: Date.now(),
          message,
          variant,
        }

        setToast(nextToast)

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        timeoutRef.current = setTimeout(() => {
          setToast((currentToast) =>
            currentToast?.id === nextToast.id ? null : currentToast,
          )
        }, 3000)
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={styles.viewport}>
          <View style={[styles.toast, variantStyles[toast.variant]]}>
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
    bottom: 28,
    alignItems: 'center',
  },
  toast: {
    width: '100%',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: radii.md,
    ...shadow,
  },
  toastText: {
    color: palette.cream,
    fontSize: 14,
    fontWeight: '600',
  },
})
