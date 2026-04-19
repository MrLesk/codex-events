export const hackathonPhotoImageVariantValues = [
  'preview',
  'original'
] as const

export type HackathonPhotoImageVariant = typeof hackathonPhotoImageVariantValues[number]

export interface HackathonPhotoRecord {
  id: string
  hackathonId: string
  fileName: string | null
  contentType: string
  width: number
  height: number
  createdAt: string
  uploadedByUserId: string
  uploadedBy: {
    id: string
    displayName: string
  } | null
  previewUrl: string
  originalUrl: string
}
