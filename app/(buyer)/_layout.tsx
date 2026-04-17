import { Tabs } from 'expo-router'
import { Text } from 'react-native'

import { palette } from '../../utils/theme'

function getBuyerTabIcon(
  routeName: string,
  color: string,
  size: number,
  focused: boolean,
) {
  const iconByRoute: Record<string, string> = {
    feed: '⌂',
    map: '⌖',
    requests: '✉',
    profile: '◉',
  }

  return (
    <Text
      style={{
        color,
        fontSize: size,
        fontWeight: focused ? '800' : '700',
        lineHeight: size + 2,
      }}
    >
      {iconByRoute[routeName] ?? '•'}
    </Text>
  )
}

export default function BuyerLayout() {
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
        tabBarIcon: ({ color, size, focused }) =>
          getBuyerTabIcon(route.name, color, size, focused),
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
        name="map"
        options={{
          title: 'Map',
        }}
      />
      <Tabs.Screen
        name="requests"
        options={{
          title: 'Requests',
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
