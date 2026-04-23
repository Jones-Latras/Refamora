import type { ExpoConfig } from 'expo/config'

type AppEnv = 'development' | 'staging' | 'production'

function normalizeAppEnv(rawValue: string | undefined): AppEnv {
  if (rawValue === 'staging' || rawValue === 'production') {
    return rawValue
  }

  return 'development'
}

function getDisplayName(appEnv: AppEnv) {
  if (appEnv === 'production') {
    return 'Refamora'
  }

  return appEnv === 'staging' ? 'Refamora Staging' : 'Refamora Dev'
}

function getBundleIdentifier(appEnv: AppEnv) {
  if (appEnv === 'production') {
    return 'com.refamora.app'
  }

  return `com.refamora.app.${appEnv}`
}

function shouldAllowCleartextTraffic(appEnv: AppEnv, rawSupabaseUrl: string) {
  if (appEnv !== 'development') {
    return false
  }

  try {
    return new URL(rawSupabaseUrl).protocol === 'http:'
  } catch {
    return false
  }
}

const appEnv = normalizeAppEnv(process.env.APP_ENV)
const supabaseUrl = process.env.SUPABASE_URL?.trim() ?? ''

const androidConfig: ExpoConfig['android'] & {
  usesCleartextTraffic?: boolean
} = {
  adaptiveIcon: {
    foregroundImage: './assets/adaptive-icon.png',
    backgroundColor: '#f5f1e8',
  },
  package: getBundleIdentifier(appEnv),
  usesCleartextTraffic: shouldAllowCleartextTraffic(appEnv, supabaseUrl),
  edgeToEdgeEnabled: true,
  softwareKeyboardLayoutMode: 'resize',
  predictiveBackGestureEnabled: false,
}

const config: ExpoConfig = {
  name: getDisplayName(appEnv),
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
    bundleIdentifier: getBundleIdentifier(appEnv),
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
    appEnv,
    supabaseUrl,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY?.trim() ?? '',
    aiListingAssistEnabled:
      process.env.EXPO_PUBLIC_AI_LISTING_ASSIST_ENABLED === 'true',
  },
}

export default config
