import { AppState } from 'react-native'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import {
  getUnreadNotificationCount,
  markNotificationsRead,
} from '../services/notificationService'
import { useAuth } from './useAuth'

type UnreadNotificationsContextValue = {
  hasUnreadNotifications: boolean
  isLoading: boolean
  markAllNotificationsRead: () => Promise<number>
  markNotificationRead: (notificationId: string) => Promise<number>
  refreshUnreadNotifications: () => Promise<number>
  unreadCount: number
}

const UnreadNotificationsContext =
  createContext<UnreadNotificationsContextValue | null>(null)

export function UnreadNotificationsProvider({
  children,
}: {
  children: ReactNode
}) {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const unreadCountRef = useRef(0)

  useEffect(() => {
    unreadCountRef.current = unreadCount
  }, [unreadCount])

  const refreshUnreadNotifications = useCallback(async () => {
    if (!user) {
      setUnreadCount(0)
      return 0
    }

    setIsLoading(true)

    try {
      const result = await getUnreadNotificationCount(user.id)

      if (result.error || typeof result.data !== 'number') {
        return unreadCountRef.current
      }

      setUnreadCount(result.data)
      return result.data
    } finally {
      setIsLoading(false)
    }
  }, [user])

  const markAllNotificationsRead = useCallback(async () => {
    const result = await markNotificationsRead()

    if (result.error) {
      return unreadCountRef.current
    }

    return refreshUnreadNotifications()
  }, [refreshUnreadNotifications])

  const markNotificationRead = useCallback(
    async (notificationId: string) => {
      const result = await markNotificationsRead([notificationId])

      if (result.error) {
        return unreadCountRef.current
      }

      return refreshUnreadNotifications()
    },
    [refreshUnreadNotifications],
  )

  useEffect(() => {
    void refreshUnreadNotifications()
  }, [refreshUnreadNotifications])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshUnreadNotifications()
      }
    })

    return () => subscription.remove()
  }, [refreshUnreadNotifications])

  return (
    <UnreadNotificationsContext.Provider
      value={{
        hasUnreadNotifications: unreadCount > 0,
        isLoading,
        markAllNotificationsRead,
        markNotificationRead,
        refreshUnreadNotifications,
        unreadCount,
      }}
    >
      {children}
    </UnreadNotificationsContext.Provider>
  )
}

export function useUnreadNotifications() {
  const context = useContext(UnreadNotificationsContext)

  if (!context) {
    throw new Error(
      'useUnreadNotifications must be used inside UnreadNotificationsProvider.',
    )
  }

  return context
}
