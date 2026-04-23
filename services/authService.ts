import type { AuthError, Session, User } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AuthResult = { user: User | null; error: AuthError | Error | null }
let suppressNextSignedOutNotice = false
let recoveredInvalidSession = false

function getEmailRedirectUrl() {
  return Linking.createURL('/callback')
}

function getPasswordResetRedirectUrl() {
  return Linking.createURL('/reset-password')
}

function extractSessionTokensFromUrl(url: string) {
  const trimmed = url.trim()

  if (!trimmed) {
    return { accessToken: '', refreshToken: '' }
  }

  const hashIndex = trimmed.indexOf('#')
  const queryIndex = trimmed.indexOf('?')
  const rawParams =
    hashIndex >= 0
      ? trimmed.slice(hashIndex + 1)
      : queryIndex >= 0
        ? trimmed.slice(queryIndex + 1)
        : ''

  const params = new URLSearchParams(rawParams)

  return {
    accessToken: params.get('access_token')?.trim() ?? '',
    refreshToken: params.get('refresh_token')?.trim() ?? '',
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message.toLowerCase()
  }

  if (typeof error === 'string') {
    return error.toLowerCase()
  }

  return ''
}

function isInvalidRefreshTokenError(error: unknown) {
  const message = getErrorMessage(error)

  if (!message.includes('refresh token')) {
    return false
  }

  return (
    message.includes('invalid') ||
    message.includes('not found') ||
    message.includes('expired') ||
    message.includes('revoked')
  )
}

async function clearLocalAuthSession() {
  if (!hasSupabaseEnv) {
    return
  }

  try {
    await getSupabaseClient().auth.signOut({ scope: 'local' })
  } catch {
    // Ignore cleanup failures. The caller is already recovering from stale local auth state.
  }
}

export async function signUp(
  email: string,
  password: string,
  metadata?: {
    full_name?: string
    phone?: string
    city?: string
    role?: 'farmer' | 'buyer'
  },
): Promise<AuthResult> {
  if (!hasSupabaseEnv) {
    return { user: null, error: new Error('Supabase is not configured yet.') }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
      emailRedirectTo: getEmailRedirectUrl(),
    },
  })

  return { user: data.user, error }
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!hasSupabaseEnv) {
    return { user: null, error: new Error('Supabase is not configured yet.') }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  return { user: data.user, error }
}

export async function requestPasswordReset(email: string) {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  return getSupabaseClient().auth.resetPasswordForEmail(email, {
    redirectTo: getPasswordResetRedirectUrl(),
  })
}

export async function signOut() {
  suppressNextSignedOutNotice = true

  if (!hasSupabaseEnv) {
    return { error: null }
  }

  const result = await getSupabaseClient().auth.signOut()

  if (result.error) {
    suppressNextSignedOutNotice = false
  }

  return result
}

export async function updatePassword(password: string) {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  return getSupabaseClient().auth.updateUser({ password })
}

export async function getSession(): Promise<Session | null> {
  if (!hasSupabaseEnv) {
    return null
  }

  try {
    const { data, error } = await getSupabaseClient().auth.getSession()

    if (error) {
      throw error
    }

    return data.session
  } catch (error) {
    if (isInvalidRefreshTokenError(error)) {
      recoveredInvalidSession = true
      await clearLocalAuthSession()
      return null
    }

    throw error instanceof Error
      ? error
      : new Error('Unable to restore your session.')
  }
}

export async function createSessionFromUrl(url: string) {
  if (!hasSupabaseEnv) {
    return { session: null, error: new Error('Supabase is not configured yet.') }
  }

  const { accessToken, refreshToken } = extractSessionTokensFromUrl(url)

  if (!accessToken || !refreshToken) {
    return { session: null, error: null }
  }

  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken,
  })

  return { session: data.session, error }
}

export function consumeSignedOutNoticeSuppression() {
  const shouldSuppress = suppressNextSignedOutNotice
  suppressNextSignedOutNotice = false
  return shouldSuppress
}

export function consumeInvalidSessionRecovery() {
  const shouldNotify = recoveredInvalidSession
  recoveredInvalidSession = false
  return shouldNotify
}
