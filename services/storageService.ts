import { decode } from 'base64-arraybuffer'
import * as FileSystem from 'expo-file-system/legacy'

import type { ServiceResult } from '../types/app'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type StorageBucket = 'avatars' | 'listing-images'
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024

function getStorageSetupHint(bucket: StorageBucket) {
  return `Supabase Storage for "${bucket}" is not fully configured. Re-run the storage SQL in supabase/seeds/20260416_storage_repair.sql.`
}

function toStorageError(
  error: unknown,
  bucket: StorageBucket,
  fallbackMessage: string,
) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : fallbackMessage
  const normalizedMessage = message.toLowerCase()

  if (
    normalizedMessage.includes('row-level security') ||
    normalizedMessage.includes('violates') ||
    normalizedMessage.includes('not allowed')
  ) {
    return new Error(getStorageSetupHint(bucket))
  }

  if (normalizedMessage.includes('bucket') && normalizedMessage.includes('not found')) {
    return new Error(getStorageSetupHint(bucket))
  }

  if (normalizedMessage.includes('network request failed')) {
    return new Error(
      'Could not reach Supabase Storage. Check your internet connection and verify SUPABASE_URL is correct.',
    )
  }

  if (
    normalizedMessage.includes('maximum allowed size') ||
    normalizedMessage.includes('file too large') ||
    normalizedMessage.includes('payload too large')
  ) {
    return new Error(
      'This image is too large for upload. Choose a smaller photo or crop it before uploading.',
    )
  }

  return new Error(message || fallbackMessage)
}

export async function uploadImage(
  bucket: StorageBucket,
  filePath: string,
  fileUri: string,
): Promise<ServiceResult<string>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(fileUri)

    if (!fileInfo.exists) {
      return { data: null, error: new Error('Selected image could not be found.') }
    }

    if ('size' in fileInfo && typeof fileInfo.size === 'number') {
      if (fileInfo.size > MAX_UPLOAD_SIZE_BYTES) {
        return {
          data: null,
          error: new Error(
            'This image is too large for upload. Choose a smaller photo or crop it before uploading.',
          ),
        }
      }
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

    if (error) {
      return {
        data: null,
        error: toStorageError(error, bucket, 'Failed to upload image.'),
      }
    }

    return { data: data?.path ?? null, error: null }
  } catch (error) {
    return {
      data: null,
      error: toStorageError(error, bucket, 'Failed to prepare image upload.'),
    }
  }
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
