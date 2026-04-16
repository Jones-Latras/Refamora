import { decode } from 'base64-arraybuffer'
import * as FileSystem from 'expo-file-system'

import type { ServiceResult } from '../types/app'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type StorageBucket = 'avatars' | 'listing-images'

export async function uploadImage(
  bucket: StorageBucket,
  filePath: string,
  fileUri: string,
): Promise<ServiceResult<string>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const base64 = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  })

  const { data, error } = await getSupabaseClient().storage
    .from(bucket)
    .upload(filePath, decode(base64), {
      contentType: 'image/jpeg',
      upsert: true,
    })

  return { data: data?.path ?? null, error }
}

export async function uploadListingImage(
  uri: string,
  userId: string,
): Promise<ServiceResult<string>> {
  const filePath = `${userId}/${Date.now()}.jpg`
  const uploadResult = await uploadImage('listing-images', filePath, uri)

  if (uploadResult.error || !uploadResult.data) {
    return {
      data: null,
      error: uploadResult.error ?? new Error('Failed to upload listing image.'),
    }
  }

  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data } = getSupabaseClient().storage
    .from('listing-images')
    .getPublicUrl(uploadResult.data)

  return { data: data.publicUrl, error: null }
}

export async function uploadAvatarImage(
  uri: string,
  userId: string,
): Promise<ServiceResult<string>> {
  const filePath = `${userId}/avatar-${Date.now()}.jpg`
  const uploadResult = await uploadImage('avatars', filePath, uri)

  if (uploadResult.error || !uploadResult.data) {
    return {
      data: null,
      error: uploadResult.error ?? new Error('Failed to upload profile photo.'),
    }
  }

  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data } = getSupabaseClient().storage
    .from('avatars')
    .getPublicUrl(uploadResult.data)

  return { data: data.publicUrl, error: null }
}

export async function deleteImage(
  bucket: StorageBucket,
  filePath: string,
) {
  if (!hasSupabaseEnv) {
    return { data: null, error: null }
  }

  return getSupabaseClient().storage.from(bucket).remove([filePath])
}
