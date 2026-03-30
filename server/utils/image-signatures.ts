export const supportedImageContentTypes = [
  'image/jpeg',
  'image/png'
] as const

export type SupportedImageContentType = typeof supportedImageContentTypes[number]

const jpegSignature = [0xff, 0xd8, 0xff] as const
const pngSignature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] as const

function matchesSignature(data: Uint8Array, signature: readonly number[]) {
  if (data.byteLength < signature.length) {
    return false
  }

  return signature.every((byte, index) => data[index] === byte)
}

export function detectSupportedImageContentType(data: Uint8Array): SupportedImageContentType | null {
  if (matchesSignature(data, pngSignature)) {
    return 'image/png'
  }

  if (matchesSignature(data, jpegSignature)) {
    return 'image/jpeg'
  }

  return null
}
