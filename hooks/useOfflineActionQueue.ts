import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type QueuedContactRequestPayload = {
  listingId: string
  buyerId: string
  sellerId: string
  message: string | null
}

type QueuedContactRequestMessagePayload = {
  requestId: string
  senderId: string
  message: string
  actorRole: 'buyer' | 'farmer'
}

type OfflineActionQueueItemBase = {
  id: string
  userId: string
  createdAt: string
  attemptCount: number
  lastAttemptAt: string | null
}

export type QueuedContactRequestItem = OfflineActionQueueItemBase & {
  kind: 'contact_request'
  payload: QueuedContactRequestPayload
}

export type QueuedContactRequestMessageItem = OfflineActionQueueItemBase & {
  kind: 'contact_request_message'
  payload: QueuedContactRequestMessagePayload
}

export type OfflineActionQueueItem =
  | QueuedContactRequestItem
  | QueuedContactRequestMessageItem

type OfflineActionQueueState = {
  items: OfflineActionQueueItem[]
  enqueueContactRequest: (input: {
    userId: string
    payload: QueuedContactRequestPayload
  }) => { id: string; wasExisting: boolean }
  enqueueContactRequestMessage: (input: {
    userId: string
    payload: QueuedContactRequestMessagePayload
  }) => { id: string; wasExisting: boolean }
  markAttempted: (id: string) => void
  removeItem: (id: string) => void
}

function createQueueId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createBaseItem(id: string, userId: string): OfflineActionQueueItemBase {
  return {
    id,
    userId,
    createdAt: new Date().toISOString(),
    attemptCount: 0,
    lastAttemptAt: null,
  }
}

export const useOfflineActionQueueStore = create<OfflineActionQueueState>()(
  persist(
    (set) => ({
      items: [],
      enqueueContactRequest: ({ userId, payload }) => {
        const id = createQueueId('contact-request')
        let nextResult = { id, wasExisting: false }

        set((state) => {
          const existing = state.items.find(
            (item) =>
              item.kind === 'contact_request' &&
              item.userId === userId &&
              item.payload.listingId === payload.listingId,
          )

          if (existing) {
            nextResult = { id: existing.id, wasExisting: true }
            return state
          }

          return {
            items: [
              ...state.items,
              {
                ...createBaseItem(id, userId),
                kind: 'contact_request',
                payload,
              },
            ],
          }
        })

        return nextResult
      },
      enqueueContactRequestMessage: ({ userId, payload }) => {
        const id = createQueueId('contact-message')
        let nextResult = { id, wasExisting: false }

        set((state) => {
          const existing = state.items.find(
            (item) =>
              item.kind === 'contact_request_message' &&
              item.userId === userId &&
              item.payload.requestId === payload.requestId &&
              item.payload.senderId === payload.senderId &&
              item.payload.message.trim() === payload.message.trim(),
          )

          if (existing) {
            nextResult = { id: existing.id, wasExisting: true }
            return state
          }

          return {
            items: [
              ...state.items,
              {
                ...createBaseItem(id, userId),
                kind: 'contact_request_message',
                payload,
              },
            ],
          }
        })

        return nextResult
      },
      markAttempted: (id) =>
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  attemptCount: item.attemptCount + 1,
                  lastAttemptAt: new Date().toISOString(),
                }
              : item,
          ),
        })),
      removeItem: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),
    }),
    {
      name: 'offline-action-queue',
      storage: createJSONStorage(() => AsyncStorage),
    },
  ),
)
