import { useEffect, useState } from 'react'
import { Image, type ImageProps } from 'react-native'
import * as FileSystem from 'expo-file-system/legacy'

type AppImageProps = Omit<ImageProps, 'source'> & {
  uri: string
}

const remoteImageCacheDirectory = FileSystem.cacheDirectory
  ? `${FileSystem.cacheDirectory}remote-images/`
  : null

function isRemoteUri(uri: string) {
  return /^https?:\/\//i.test(uri)
}

function getFileExtension(uri: string) {
  const sanitizedUri = uri.split('?')[0] ?? uri
  const match = sanitizedUri.match(/\.([a-z0-9]{2,5})$/i)

  return match ? `.${match[1].toLowerCase()}` : '.img'
}

function getCacheFileName(uri: string) {
  let hash = 0

  for (let index = 0; index < uri.length; index += 1) {
    hash = (hash * 31 + uri.charCodeAt(index)) | 0
  }

  return `${Math.abs(hash).toString(36)}${getFileExtension(uri)}`
}

async function resolveImageUri(uri: string) {
  if (!isRemoteUri(uri) || !remoteImageCacheDirectory) {
    return uri
  }

  try {
    await FileSystem.makeDirectoryAsync(remoteImageCacheDirectory, {
      intermediates: true,
    })

    const localUri = `${remoteImageCacheDirectory}${getCacheFileName(uri)}`
    const cachedFile = await FileSystem.getInfoAsync(localUri)

    if (cachedFile.exists) {
      return localUri
    }

    const downloadResult = await FileSystem.downloadAsync(uri, localUri)
    return downloadResult.uri
  } catch {
    return uri
  }
}

export function AppImage({ uri, ...props }: AppImageProps) {
  const [resolvedUri, setResolvedUri] = useState(uri)

  useEffect(() => {
    let isMounted = true

    setResolvedUri(uri)

    void resolveImageUri(uri).then((nextUri) => {
      if (isMounted) {
        setResolvedUri(nextUri)
      }
    })

    return () => {
      isMounted = false
    }
  }, [uri])

  return <Image {...props} source={{ uri: resolvedUri }} />
}
