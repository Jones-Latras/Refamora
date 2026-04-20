import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/database'

type ExpoExtra = {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

const LOCAL_SUPABASE_PORT = '54321'

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra

function getExpoDevHost() {
  const candidates = [
    Constants.expoConfig?.hostUri,
    Constants.expoGoConfig?.debuggerHost,
  ]

  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue
    }

    const [host] = candidate.trim().split(':')

    if (host) {
      return host
    }
  }

  return ''
}

function isLoopbackHost(hostname: string) {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  )
}

function isPrivateIpv4Host(hostname: string) {
  const octets = hostname.split('.').map((segment) => Number.parseInt(segment, 10))

  if (
    octets.length !== 4 ||
    octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)
  ) {
    return false
  }

  const [first, second] = octets

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

function resolveSupabaseUrl(rawUrl: string) {
  const trimmedUrl = rawUrl.trim()

  if (!trimmedUrl || !__DEV__) {
    return trimmedUrl
  }

  const expoDevHost = getExpoDevHost()

  if (!expoDevHost) {
    return trimmedUrl
  }

  try {
    const url = new URL(trimmedUrl)
    const isLocalSupabaseHost =
      isLoopbackHost(url.hostname) || isPrivateIpv4Host(url.hostname)

    if (
      url.protocol !== 'http:' ||
      url.port !== LOCAL_SUPABASE_PORT ||
      !isLocalSupabaseHost ||
      url.hostname === expoDevHost
    ) {
      return trimmedUrl
    }

    // Keep `.env.local` on 127.0.0.1 and follow Expo's current LAN host in dev.
    url.hostname = expoDevHost
    return url.toString().replace(/\/$/, '')
  } catch {
    return trimmedUrl
  }
}

const supabaseUrl =
  typeof extra.supabaseUrl === 'string'
    ? resolveSupabaseUrl(extra.supabaseUrl)
    : ''
const supabaseAnonKey =
  typeof extra.supabaseAnonKey === 'string' ? extra.supabaseAnonKey.trim() : ''

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseEnv
  ? createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    })
  : null

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(
      'Missing Supabase environment variables. Add SUPABASE_URL and SUPABASE_ANON_KEY to .env or .env.local.',
    )
  }

  return supabase
}

export function getSupabaseConfigError() {
  return new Error(
    'Supabase is not configured yet. Copy SUPABASE_URL and SUPABASE_ANON_KEY into .env or .env.local to unlock auth and data.',
  )
}
