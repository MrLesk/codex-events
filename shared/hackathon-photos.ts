export const hackathonPhotoImageVariantValues = [
  'preview',
  'original'
] as const

export type HackathonPhotoImageVariant = typeof hackathonPhotoImageVariantValues[number]

export interface HackathonPhotoRecord {
  id: string
  hackathonId: string
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
