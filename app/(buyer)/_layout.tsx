import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'
import { StyleSheet, View } from 'react-native'

import { useUnreadMessages } from '../../hooks/useUnreadMessages'
import { palette } from '../../utils/theme'

function getBuyerTabIcon(
  routeName: string,
  color: string,
  size: number,
  showUnreadDot: boolean,
) {
  let iconName: React.ComponentProps<typeof Feather>['name'] = 'home'

  switch (routeName) {
    case 'feed':
      iconName = 'home'
      break
    case 'saved-listings':
      iconName = 'bookmark'
      break
    case 'map':
      iconName = 'map'
      break
    case 'requests':
      iconName = 'message-square'
      break
    case 'profile':
      iconName = 'user'
      break
    default:
      iconName = 'home'
  }

  return (
    <View style={styles.iconContainer}>
      <Feather name={iconName} size={size} color={color} />
      {showUnreadDot ? <View style={styles.unreadDot} /> : null}
    </View>
  )
}

export default function BuyerLayout() {
  const { hasUnreadMessages } = useUnreadMessages()

  return (
    <Tabs
      screenOptions={({ route }) => ({
        tabBarActiveTintColor: palette.sageDark,
        tabBarInactiveTintColor: palette.muted,
        tabBarHideOnKeyboard: true,
        tabBarStyle: {
          backgroundColor: palette.surface,
          borderTopColor: palette.border,
          height: 68,
          paddingTop: 8,
          paddingBottom: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
        tabBarIconStyle: {
          marginBottom: 2,
        },
        tabBarIcon: ({ color, size }) =>
          getBuyerTabIcon(
            route.name,
            color,
            size,
            route.name === 'requests' && hasUnreadMessages,
          ),
        headerShadowVisible: false,
        headerTintColor: palette.soil,
        headerStyle: { backgroundColor: palette.cream },
        headerBackTitleVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        sceneStyle: { backgroundColor: palette.cream },
      })}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="saved-listings"
        options={{
          title: 'Saved',
        }}
      />
      <Tabs.Screen
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Messages',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
        }}
      />
      <Tabs.Screen
        name="dashboard"
        options={{
          href: null,
          title: 'Buyer Dashboard',
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  iconContainer: {
    minWidth: 22,
    minHeight: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.sage,
    borderWidth: 1,
    borderColor: palette.surface,
  },
})
