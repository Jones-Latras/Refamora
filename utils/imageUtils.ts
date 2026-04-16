import * as ImageManipulator from 'expo-image-manipulator'
import * as ImagePicker from 'expo-image-picker'

export async function pickAndCompressImage() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [4, 3],
    quality: 1,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 800 } }],
    {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  )

  return compressed.uri
}

export async function pickAndCompressAvatar() {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 1,
  })

  if (result.canceled || !result.assets[0]) {
    return null
  }

  const compressed = await ImageManipulator.manipulateAsync(
    result.assets[0].uri,
    [{ resize: { width: 600, height: 600 } }],
    {
      compress: 0.75,
      format: ImageManipulator.SaveFormat.JPEG,
    },
  )

  return compressed.uri
}
