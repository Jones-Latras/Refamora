import { decode } from 'base64-arraybuffer'

import type { ServiceResult } from '../types/app'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

export async function uploadImage(
  bucket: 'avatars' | 'listing-images',
  filePath: string,
  fileUri: string,
): Promise<ServiceResult<string>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const response = await fetch(fileUri)
  const blob = await response.blob()
  const reader = new FileReader()

  const base64 = await new Promise<string>((resolve, reject) => {
    reader.onloadend = () => {
      const result = reader.result
      if (typeof result === 'string') {
        resolve(result.split(',')[1] ?? '')
        return
      }

      reject(new Error('Failed to read image for upload.'))
    }

    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  const { data, error } = await getSupabaseClient().storage
    .from(bucket)
    .upload(filePath, decode(base64), {
      contentType: 'image/jpeg',
      upsert: true,
    })

  return { data: data?.path ?? null, error }
}

export async function deleteImage(
  bucket: 'avatars' | 'listing-images',
  filePath: string,
) {
  if (!hasSupabaseEnv) {
    return { data: null, error: null }
  }

  return getSupabaseClient().storage.from(bucket).remove([filePath])
}
