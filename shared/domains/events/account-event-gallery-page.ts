import { z } from 'zod'

const photoSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  fileName: z.string().nullable(),
  isPubliclyVisible: z.boolean(),
  isHighlighted: z.boolean().optional(),
  contentType: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  createdAt: z.string(),
  uploadedByUserId: z.string().nullable(),
  uploadedBy: z.object({
    id: z.string(),
    displayName: z.string()
  }).nullable(),
  previewUrl: z.string().nullable(),
  originalUrl: z.string().nullable()
})

export const accountEventGalleryPageSchema = z.object({
  photos: z.array(photoSchema)
})

export type AccountEventGalleryPhoto = z.infer<typeof photoSchema>
export type AccountEventGalleryPage = z.infer<typeof accountEventGalleryPageSchema>
