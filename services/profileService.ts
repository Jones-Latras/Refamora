import type { UserRole } from '../types/app'
import type { Tables, TablesInsert, TablesUpdate } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type UserProfile = Tables<'users'>

export async function getUserProfile(userId: string) {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  return getSupabaseClient()
    .from('users')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
}

export async function initializeUserProfile(profile: TablesInsert<'users'>) {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  return getSupabaseClient()
    .from('users')
    .upsert(profile, { onConflict: 'id' })
    .select()
    .single()
}

export async function updateUserProfile(
  userId: string,
  updates: TablesUpdate<'users'>,
) {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  return getSupabaseClient()
    .from('users')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
}

export async function setUserRole(userId: string, role: UserRole) {
  return updateUserProfile(userId, { role })
}

export async function getUserRole(userId: string): Promise<UserRole | null> {
  if (!hasSupabaseEnv) {
    return null
  }

  const { data } = await getSupabaseClient()
    .from('users')
    .select('role')
    .eq('id', userId)
    .maybeSingle()

  return (data?.role as UserRole | null) ?? null
}
