import { z } from 'zod'

const requiredTextSchema = z.string().trim().min(1)

export const teamProfileFormSchema = z.object({
  name: requiredTextSchema,
  bio: z.string().trim().max(4000)
})
