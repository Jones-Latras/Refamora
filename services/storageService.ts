import { decode } from 'base64-arraybuffer'
import * as FileSystem from 'expo-file-system/legacy'

import type { ServiceResult } from '../types/app'

import { getSupabaseClient, hasSupabaseEnv } from './supabase'

type StorageBucket = 'avatars' | 'listing-images' | 'verification-documents'
const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024
const SUPPORTED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return `${Math.round(bytes / 1024)} KB`
}

function getFileExtension(uri: string) {
  const match = uri.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/)
  return match?.[1] ?? null
}

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

  if (
    normalizedMessage.includes('mime') ||
    normalizedMessage.includes('content type') ||
    normalizedMessage.includes('invalid file type') ||
    normalizedMessage.includes('unsupported')
  ) {
    return new Error(
      'This image format is not supported. Use a JPG, PNG, or WEBP image instead.',
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

    const extension = getFileExtension(fileUri)

    if (extension && !SUPPORTED_IMAGE_EXTENSIONS.includes(extension)) {
      return {
        data: null,
        error: new Error(
          'This image format is not supported. Use a JPG, PNG, or WEBP image instead.',
        ),
      }
    }

    if ('size' in fileInfo && typeof fileInfo.size === 'number') {
      if (fileInfo.size > MAX_UPLOAD_SIZE_BYTES) {
        return {
          data: null,
          error: new Error(
            `This image is ${formatFileSize(
              fileInfo.size,
            )}, which is above the 5 MB upload limit. Crop or compress it, then try again.`,
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
        contentType:
          extension === 'png'
            ? 'image/png'
            : extension === 'webp'
              ? 'image/webp'
              : 'image/jpeg',
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

export async function uploadVerificationDocument(
  uri: string,
  userId: string,
): Promise<ServiceResult<string>> {
  const filePath = `${userId}/verification-${Date.now()}.jpg`
  const uploadResult = await uploadImage('verification-documents', filePath, uri)

  if (uploadResult.error || !uploadResult.data) {
    return {
      data: null,
      error: uploadResult.error ?? new Error('Failed to upload verification document.'),
    }
  }

  return { data: uploadResult.data, error: null }
}

export async function getVerificationDocumentSignedUrl(
  filePath: string,
): Promise<ServiceResult<string>> {
  if (!hasSupabaseEnv) {
    return { data: null, error: new Error('Supabase is not configured yet.') }
  }

  const { data, error } = await getSupabaseClient()
    .storage
    .from('verification-documents')
    .createSignedUrl(filePath, 60 * 30)

  if (error) {
    return {
      data: null,
      error: toStorageError(error, 'verification-documents', 'Failed to open verification document.'),
    }
  }

  return { data: data.signedUrl, error: null }
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
