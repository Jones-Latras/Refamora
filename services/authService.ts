import type { AuthError, Session, User } from '@supabase/supabase-js'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type AuthResult = { user: User | null; error: AuthError | Error | null }

export async function signUp(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!hasSupabaseEnv) {
    return { user: null, error: new Error('Supabase is not configured yet.') }
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.auth.signUp({ email, password })

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
  if (!hasSupabaseEnv) {
    return { error: null }
  }

  return getSupabaseClient().auth.signOut()
}

export async function getSession(): Promise<Session | null> {
  if (!hasSupabaseEnv) {
    return null
  }

  const { data } = await getSupabaseClient().auth.getSession()

  return data.session
}
