import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'
import { Platform } from 'react-native'

async function pickImage(
  aspect: [number, number],
  resize: { width: number; height?: number },
) {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()

  if (!permission.granted) {
    return null
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect,
    quality: 1,
    base64: false,
    exif: false,
    legacy: Platform.OS === 'android',
  })

  const asset = result.assets?.[0]

  if (result.canceled || !asset?.uri) {
    return null
  }

  try {
    const compressed = await ImageManipulator.manipulateAsync(
      asset.uri,
      [{ resize }],
      {
        compress: 0.5,
        format: ImageManipulator.SaveFormat.JPEG,
      },
    )

    return compressed.uri ?? asset.uri
  } catch {
    return asset.uri
  }
}

export async function pickAndCompressImage() {
  return pickImage([4, 3], { width: 1280 })
}

export async function pickAndCompressAvatar() {
  return pickImage([1, 1], { width: 600, height: 600 })
}
