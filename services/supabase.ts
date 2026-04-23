import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import { createClient } from '@supabase/supabase-js'

import type { Database } from '../types/database'
import { getExpoDevHost, resolveSupabaseUrl } from '../utils/supabaseUrl'

type ExpoExtra = {
  supabaseUrl?: string
  supabaseAnonKey?: string
}

const extra = (Constants.expoConfig?.extra ?? {}) as ExpoExtra
const expoDevHost = getExpoDevHost([
  Constants.expoConfig?.hostUri,
  Constants.expoGoConfig?.debuggerHost,
])

const supabaseUrl =
  typeof extra.supabaseUrl === 'string'
    ? resolveSupabaseUrl(extra.supabaseUrl, expoDevHost, __DEV__)
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
