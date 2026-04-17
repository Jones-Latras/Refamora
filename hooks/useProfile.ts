import type { Tables } from '../types/database'

import { useCallback } from 'react'

import { useAsync } from './useAsync'

import { getUserProfile } from '../services/profileService'

export function useProfile(userId?: string | null) {
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      return null
    }

    const result = await getUserProfile(userId)

    if (result.error) {
      throw result.error
    }

    return result.data
  }, [userId])

  const { data, isLoading, error, refetch } = useAsync<Tables<'users'> | null>(
    fetchProfile,
    [userId],
    Boolean(userId),
  )

  return {
    profile: data,
    isLoading,
    error,
    refetch,
  }
}
