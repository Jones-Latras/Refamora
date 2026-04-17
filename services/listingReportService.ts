import type { ServiceResult } from '../types/app'
import type { Tables, TablesInsert } from '../types/database'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type ListingReport = Tables<'listing_reports'>

export async function submitListingReport(
  payload: TablesInsert<'listing_reports'>,
): Promise<ServiceResult<ListingReport>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .from('listing_reports')
    .insert(payload)
    .select()
    .single()

  return { data, error }
}
