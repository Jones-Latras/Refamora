import type { AuthError, Session, User } from '@supabase/supabase-js'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AuthResult = { user: User | null; error: AuthError | Error | null }
let suppressNextSignedOutNotice = false

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

  const { data } = await getSupabaseClient().auth.getSession()

  return data.session
}

export function consumeSignedOutNoticeSuppression() {
  const shouldSuppress = suppressNextSignedOutNotice
  suppressNextSignedOutNotice = false
  return shouldSuppress
}
