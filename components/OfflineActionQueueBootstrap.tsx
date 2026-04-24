import { useEffect, useRef } from 'react'

import { useAuth } from '../hooks/useAuth'
import { useConnectivity } from '../hooks/useConnectivity'
import {
  useOfflineActionQueueStore,
  type OfflineActionQueueItem,
} from '../hooks/useOfflineActionQueue'
import { useOfflineDataStore } from '../hooks/useOfflineData'
import { useToast } from './Toast'
import { useUnreadMessages } from '../hooks/useUnreadMessages'
import {
  getBuyerContactRequests,
  getContactConversation,
  getSellerInquiries,
  sendContactRequest,
  sendContactRequestMessage,
} from '../services/contactService'
import { shouldAttemptOfflineQueueSync } from '../utils/offlineQueue'

function getQueueErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.trim().toLowerCase()
  }

  return ''
}

function shouldDropOfflineQueueItem(error: unknown) {
  const message = getQueueErrorMessage(error)

  if (!message) {
    return false
  }

  return (
    message.includes('write a message') ||
    message.includes('not be found') ||
    message.includes('no longer have access') ||
    message.includes('duplicate') ||
    message.includes('already')
  )
}

export function OfflineActionQueueBootstrap() {
  const { user } = useAuth()
  const { isOffline } = useConnectivity()
  const { showToast } = useToast()
  const { refreshUnreadMessages } = useUnreadMessages()
  const queueItems = useOfflineActionQueueStore((state) => state.items)
  const markAttempted = useOfflineActionQueueStore((state) => state.markAttempted)
  const removeItem = useOfflineActionQueueStore((state) => state.removeItem)
  const setBuyerRequests = useOfflineDataStore((state) => state.setBuyerRequests)
  const setSellerRequests = useOfflineDataStore((state) => state.setSellerRequests)
  const setConversation = useOfflineDataStore((state) => state.setConversation)
  const isProcessingRef = useRef(false)

  useEffect(() => {
    if (!user || isOffline || isProcessingRef.current) {
      return
    }

    const nextItem =
      queueItems.find(
        (item) =>
          item.userId === user.id &&
          shouldAttemptOfflineQueueSync({
            attemptCount: item.attemptCount,
            lastAttemptAt: item.lastAttemptAt,
          }),
      ) ?? null

    if (!nextItem) {
      return
    }

    const refreshBuyerState = async () => {
      const result = await getBuyerContactRequests(user.id)

      if (!result.error) {
        setBuyerRequests(user.id, result.data ?? [])
      }
    }

    const refreshSellerState = async () => {
      const result = await getSellerInquiries(user.id)

      if (!result.error) {
        setSellerRequests(user.id, result.data ?? [])
      }
    }

    const refreshConversationState = async (item: OfflineActionQueueItem) => {
      if (item.kind !== 'contact_request_message') {
        return
      }

      const result = await getContactConversation(item.payload.requestId, user.id)

      if (!result.error && result.data) {
        setConversation(item.payload.requestId, result.data)
      }
    }

    const processNextItem = async () => {
      isProcessingRef.current = true
      markAttempted(nextItem.id)

      try {
        if (nextItem.kind === 'contact_request') {
          const result = await sendContactRequest({
            listing_id: nextItem.payload.listingId,
            buyer_id: nextItem.payload.buyerId,
            seller_id: nextItem.payload.sellerId,
            message: nextItem.payload.message,
          })

          if (result.error) {
            throw result.error
          }

          removeItem(nextItem.id)
          await refreshBuyerState()
          void refreshUnreadMessages()
          showToast('Queued inquiry sent.', 'success')
          return
        }

        const result = await sendContactRequestMessage({
          request_id: nextItem.payload.requestId,
          sender_id: nextItem.payload.senderId,
          message: nextItem.payload.message,
        })

        if (result.error) {
          throw result.error
        }

        removeItem(nextItem.id)
        await refreshConversationState(nextItem)

        if (nextItem.payload.actorRole === 'buyer') {
          await refreshBuyerState()
        } else {
          await refreshSellerState()
        }

        void refreshUnreadMessages()
        showToast('Queued message sent.', 'success')
      } catch (error) {
        if (shouldDropOfflineQueueItem(error)) {
          removeItem(nextItem.id)
          showToast('A queued message could not be synced and was removed.', 'error')
        }
      } finally {
        isProcessingRef.current = false
      }
    }

    void processNextItem()
  }, [
    isOffline,
    markAttempted,
    queueItems,
    refreshUnreadMessages,
    removeItem,
    setBuyerRequests,
    setConversation,
    setSellerRequests,
    showToast,
    user,
  ])

  return null
}
