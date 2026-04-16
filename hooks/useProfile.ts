import type { Tables } from '../types/database'

import { useAsync } from './useAsync'

import { getUserProfile } from '../services/profileService'

export function useProfile(userId?: string | null) {
  const { data, isLoading, error, refetch } = useAsync<Tables<'users'> | null>(
    async () => {
      if (!userId) {
        return null
      }

      const result = await getUserProfile(userId)

      if (result.error) {
        throw result.error
      }

      return result.data
    },
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
