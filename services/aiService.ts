import type {
  ListingAssistInput,
  ListingAssistResult,
  ServiceResult,
} from '../types/app'

import { listingAssistInputSchema, listingAssistResultSchema } from '../utils/schemas'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

export async function assistListing(
  input: ListingAssistInput,
): Promise<ServiceResult<ListingAssistResult>> {
  const parsedInput = listingAssistInputSchema.safeParse(input)

  if (!parsedInput.success) {
    return {
      data: null,
      error: new Error(parsedInput.error.issues[0]?.message ?? 'Invalid AI input.'),
    }
  }

  if (!hasSupabaseEnv) {
    return {
      data: null,
      error: new Error('Supabase is not configured yet.'),
    }
  }

  const { data, error } = await getSupabaseClient().functions.invoke(
    'ai-listing-assist',
    {
      body: parsedInput.data,
    },
  )

  if (error) {
    return { data: null, error }
  }

  const parsedResult = listingAssistResultSchema.safeParse(data)

  if (!parsedResult.success) {
    return {
      data: null,
      error: new Error('AI response did not match the expected format.'),
    }
  }

  return { data: parsedResult.data, error: null }
}
