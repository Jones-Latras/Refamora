import { Tabs } from 'expo-router'
import { Feather } from '@expo/vector-icons'

import { palette } from '../../utils/theme'

function getFarmerTabIcon(
  routeName: string,
  color: string,
  size: number,
  focused: boolean,
) {
  let iconName: React.ComponentProps<typeof Feather>['name'] = 'home'

  switch (routeName) {
    case 'dashboard':
      iconName = 'home'
      break
    case 'create-listing':
      iconName = 'plus-circle'
      break
    case 'my-listings':
      iconName = 'list'
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

  return <Feather name={iconName} size={size} color={color} />
}

export default function FarmerLayout() {
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
          getFarmerTabIcon(route.name, color, size, focused),
        headerShadowVisible: false,
        headerTintColor: palette.soil,
        headerStyle: { backgroundColor: palette.cream },
        headerBackTitleVisible: false,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        sceneStyle: { backgroundColor: palette.cream },
      })}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          headerShown: false,
        }}
      />
      <Tabs.Screen
        name="create-listing"
        options={{
          title: 'Create',
        }}
      />
      <Tabs.Screen
        name="my-listings"
        options={{
          title: 'Listings',
          headerShown: false,
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
        name="edit-listing/[id]"
        options={{
          href: null,
          title: 'Edit Listing',
        }}
      />
    </Tabs>
  )
}
