import type { ExpoConfig } from 'expo/config'

const androidConfig: ExpoConfig['android'] & {
  usesCleartextTraffic?: boolean
} = {
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#f5f1e8',
  },
  usesCleartextTraffic: true,
  edgeToEdgeEnabled: true,
  softwareKeyboardLayoutMode: 'resize',
  predictiveBackGestureEnabled: false,
}

const config: ExpoConfig = {
  name: 'Refamora',
  slug: 'refamora',
  scheme: 'agriwaste',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'light',
  newArchEnabled: true,
  splash: {
    image: './assets/splash-icon.png',
    resizeMode: 'contain',
    backgroundColor: '#f5f1e8',
  },
  ios: {
    supportsTablet: true,
  },
  android: androidConfig,
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: ['expo-router'],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? '',
    aiListingAssistEnabled:
      process.env.EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED === 'true',
  },
}

export default config
