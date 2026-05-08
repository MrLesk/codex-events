export const eventPhotoImageVariantValues = [
  'preview',
  'original'
] as const

export type EventPhotoImageVariant = typeof eventPhotoImageVariantValues[number]

export interface EventPhotoRecord {
  id: string
  eventId: string
  fileName: string | null
  isPubliclyVisible: boolean
  contentType: string
  width: number
  height: number
  createdAt: string
  uploadedByUserId: string | null
  uploadedBy: {
    id: string
    displayName: string
  } | null
  previewUrl: string
  originalUrl: string
}
