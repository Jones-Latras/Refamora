import { router } from 'expo-router'
import { useEffect, useState } from 'react'
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { Feather } from '@expo/vector-icons'
import { SafeAreaView } from 'react-native-safe-area-context'

import { EmptyState } from '../../components/EmptyState'
import { ErrorState } from '../../components/ErrorState'
import { useToast } from '../../components/Toast'
import { useAuth } from '../../hooks/useAuth'
import { useUnreadNotifications } from '../../hooks/useUnreadNotifications'
import {
  getUserNotifications,
} from '../../services/notificationService'
import type { UserNotification } from '../../types/app'
import { palette, radii, shadow } from '../../utils/theme'

function formatRelativeDate(value: string) {
  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return 'Just now'
  }

  const diffMs = Date.now() - timestamp
  const diffMinutes = Math.max(Math.floor(diffMs / 60000), 0)

  if (diffMinutes < 1) {
    return 'Just now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)

  if (diffHours < 24) {
    return `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)

  if (diffDays < 7) {
    return `${diffDays}d ago`
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

function getNotificationIcon(kind: UserNotification['kind']) {
  switch (kind) {
    case 'reply_received':
      return 'corner-up-left'
    case 'verification_approved':
      return 'shield'
    case 'verification_rejected':
      return 'alert-circle'
    default:
      return 'message-circle'
  }
}

export default function NotificationsScreen() {
  const { user } = useAuth()
  const { showToast } = useToast()
  const {
    markAllNotificationsRead,
    markNotificationRead,
    refreshUnreadNotifications,
    unreadCount,
  } = useUnreadNotifications()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isMarkingAll, setIsMarkingAll] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const loadNotifications = async (refreshing = false) => {
    if (!user) {
      setNotifications([])
      setErrorMessage('Sign in to review your notifications.')
      setIsLoading(false)
      setIsRefreshing(false)
      return
    }

    if (refreshing) {
      setIsRefreshing(true)
    } else {
      setIsLoading(true)
    }

    const result = await getUserNotifications(user.id)

    if (result.error) {
      setErrorMessage(result.error.message)
      setNotifications([])
    } else {
      setErrorMessage(null)
      setNotifications(result.data ?? [])
    }

    setIsLoading(false)
    setIsRefreshing(false)
    await refreshUnreadNotifications()
  }

  useEffect(() => {
    void loadNotifications()
  }, [user])

  const handleOpenNotification = async (notification: UserNotification) => {
    if (!notification.isRead) {
      const nextUnreadCount = await markNotificationRead(notification.id)

      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id
            ? {
                ...item,
                isRead: true,
                readAt: item.readAt ?? new Date().toISOString(),
              }
            : item,
        ),
      )

      if (nextUnreadCount < 0) {
        showToast('Unable to update this notification right now.', 'error')
      }
    }

    if (notification.entityType === 'contact_request' && notification.entityId) {
      router.push(`/(shared)/conversation/${notification.entityId}`)
      return
    }

    if (notification.entityType === 'seller_verification_request') {
      router.push('/(shared)/seller-verification')
    }
  }

  const handleMarkAllRead = async () => {
    setIsMarkingAll(true)
    await markAllNotificationsRead()
    setNotifications((current) =>
      current.map((item) => ({
        ...item,
        isRead: true,
        readAt: item.readAt ?? new Date().toISOString(),
      })),
    )
    setIsMarkingAll(false)
  }

  if (isLoading) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.loadingState}>
          <Text style={styles.loadingTitle}>Loading notifications...</Text>
          <Text style={styles.loadingText}>
            Recent inquiries, replies, and verification updates will appear here.
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  if (errorMessage) {
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
        <View style={styles.errorWrapper}>
          <ErrorState
            title="Notifications could not be loaded"
            description={errorMessage}
            onAction={() => {
              void loadNotifications()
            }}
          />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView edges={['left', 'right', 'bottom']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              void loadNotifications(true)
            }}
            tintColor={palette.sageDark}
          />
        }
      >
        <View style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroIconWrap}>
              <Feather name="bell" size={18} color={palette.cream} />
            </View>
            <View style={styles.heroTextWrap}>
              <Text style={styles.heroTitle}>Notification center</Text>
              <Text style={styles.heroText}>
                Replies, fresh inquiries, and seller verification decisions appear here.
              </Text>
            </View>
          </View>

          <View style={styles.heroFooter}>
            <Text style={styles.heroCount}>
              {unreadCount > 0
                ? `${unreadCount} unread`
                : 'All caught up'}
            </Text>
            <Pressable
              disabled={unreadCount === 0 || isMarkingAll}
              onPress={() => {
                void handleMarkAllRead()
              }}
              style={[
                styles.markAllButton,
                unreadCount === 0 || isMarkingAll ? styles.buttonDisabled : null,
              ]}
            >
              <Text style={styles.markAllButtonText}>
                {isMarkingAll ? 'Updating...' : 'Mark all read'}
              </Text>
            </Pressable>
          </View>
        </View>

        {notifications.length === 0 ? (
          <View style={styles.emptyWrapper}>
            <EmptyState
              title="No notifications yet"
              description="Once a buyer sends an inquiry, a seller replies, or verification is reviewed, the update will appear here."
            />
          </View>
        ) : (
          <View style={styles.list}>
            {notifications.map((notification) => (
              <Pressable
                key={notification.id}
                onPress={() => {
                  void handleOpenNotification(notification)
                }}
                style={[
                  styles.notificationCard,
                  !notification.isRead ? styles.notificationCardUnread : null,
                ]}
              >
                <View style={styles.notificationIconWrap}>
                  <Feather
                    name={getNotificationIcon(notification.kind)}
                    size={18}
                    color={palette.soil}
                  />
                </View>
                <View style={styles.notificationContent}>
                  <View style={styles.notificationMetaRow}>
                    <Text style={styles.notificationTitle}>{notification.title}</Text>
                    <Text style={styles.notificationDate}>
                      {formatRelativeDate(notification.createdAt)}
                    </Text>
                  </View>
                  <Text style={styles.notificationBody}>{notification.body}</Text>
                  <View style={styles.notificationFooter}>
                    {!notification.isRead ? <View style={styles.unreadPill}><Text style={styles.unreadPillText}>Unread</Text></View> : null}
                    <Text style={styles.notificationActionText}>
                      {notification.entityType === 'contact_request'
                        ? 'Open conversation'
                        : notification.entityType === 'seller_verification_request'
                          ? 'Open verification'
                          : 'Review details'}
                    </Text>
                  </View>
                </View>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: palette.cream,
  },
  content: {
    padding: 20,
    paddingBottom: 32,
    gap: 14,
  },
  loadingState: {
    margin: 20,
    padding: 18,
    borderRadius: radii.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    gap: 8,
    ...shadow,
  },
  loadingTitle: {
    color: palette.soil,
    fontSize: 17,
    fontWeight: '800',
  },
  loadingText: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  errorWrapper: {
    flex: 1,
    padding: 20,
  },
  heroCard: {
    backgroundColor: '#dbe8dc',
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: '#c6d9c8',
    padding: 16,
    gap: 14,
  },
  heroHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  heroIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: palette.sageDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTextWrap: {
    flex: 1,
    gap: 4,
  },
  heroTitle: {
    color: palette.soil,
    fontSize: 18,
    fontWeight: '800',
  },
  heroText: {
    color: palette.clay,
    fontSize: 13,
    lineHeight: 19,
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  heroCount: {
    color: palette.sageDark,
    fontSize: 13,
    fontWeight: '800',
  },
  markAllButton: {
    backgroundColor: palette.surface,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  markAllButtonText: {
    color: palette.soil,
    fontSize: 12,
    fontWeight: '800',
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  emptyWrapper: {
    marginTop: 6,
  },
  list: {
    gap: 12,
  },
  notificationCard: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: palette.surface,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: palette.border,
    padding: 14,
    ...shadow,
  },
  notificationCardUnread: {
    borderColor: '#cbdccf',
    backgroundColor: '#fbfdfb',
  },
  notificationIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#edf4ee',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
    gap: 8,
  },
  notificationMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 10,
  },
  notificationTitle: {
    flex: 1,
    color: palette.soil,
    fontSize: 14,
    fontWeight: '800',
  },
  notificationDate: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  notificationBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  notificationFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  unreadPill: {
    backgroundColor: '#edf5ec',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  unreadPillText: {
    color: palette.sageDark,
    fontSize: 11,
    fontWeight: '800',
  },
  notificationActionText: {
    color: palette.clay,
    fontSize: 12,
    fontWeight: '700',
  },
})
