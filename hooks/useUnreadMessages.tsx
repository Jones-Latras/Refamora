import { AppState } from 'react-native'
import { usePathname } from 'expo-router'
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
  getBuyerContactRequests,
  getSellerInquiries,
} from '../services/contactService'
import { useAuth } from './useAuth'

type UnreadMessagesContextValue = {
  hasUnreadMessages: boolean
  isLoading: boolean
  refreshUnreadMessages: () => Promise<number>
  unreadCount: number
}

const UnreadMessagesContext = createContext<UnreadMessagesContextValue | null>(null)

function getBuyerUnreadCount(
  requests: Awaited<ReturnType<typeof getBuyerContactRequests>>['data'] extends infer T
    ? NonNullable<T>
    : never,
) {
  return requests.filter((request) => {
    const sellerSentLatest =
      request.status === 'responded' &&
      request.lastMessageSenderId === request.sellerId

    if (!sellerSentLatest) {
      return false
    }

    if (!request.buyerLastReadAt) {
      return true
    }

    return (
      new Date(request.buyerLastReadAt).getTime() <
      new Date(request.updatedAt).getTime()
    )
  }).length
}

export function UnreadMessagesProvider({
  children,
}: {
  children: ReactNode
}) {
  const { role, user } = useAuth()
  const pathname = usePathname()
  const [unreadCount, setUnreadCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const unreadCountRef = useRef(0)

  useEffect(() => {
    unreadCountRef.current = unreadCount
  }, [unreadCount])

  const refreshUnreadMessages = useCallback(async () => {
    if (!user || !role) {
      setUnreadCount(0)
      return 0
    }

    setIsLoading(true)

    try {
      if (role === 'farmer') {
        const result = await getSellerInquiries(user.id)

        if (result.error || !result.data) {
          return unreadCountRef.current
        }

        const nextCount = result.data.filter(
          (request) => request.status === 'pending',
        ).length
        setUnreadCount(nextCount)
        return nextCount
      }

      const result = await getBuyerContactRequests(user.id)

      if (result.error || !result.data) {
        return unreadCountRef.current
      }

      const nextCount = getBuyerUnreadCount(result.data)
      setUnreadCount(nextCount)
      return nextCount
    } finally {
      setIsLoading(false)
    }
  }, [role, user])

  useEffect(() => {
    void refreshUnreadMessages()
  }, [pathname, refreshUnreadMessages])

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void refreshUnreadMessages()
      }
    })

    return () => subscription.remove()
  }, [refreshUnreadMessages])

  return (
    <UnreadMessagesContext.Provider
      value={{
        hasUnreadMessages: unreadCount > 0,
        isLoading,
        refreshUnreadMessages,
        unreadCount,
      }}
    >
      {children}
    </UnreadMessagesContext.Provider>
  )
}

export function useUnreadMessages() {
  const context = useContext(UnreadMessagesContext)

  if (!context) {
    throw new Error(
      'useUnreadMessages must be used inside UnreadMessagesProvider.',
    )
  }

  return context
}
