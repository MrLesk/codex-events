import { z } from 'zod'

import { accountEventParticipantsPageSchema } from './account-event-participants-page'

export const accountEventCertificatesPageSchema = z.object({
  applications: z.array(accountEventParticipantsPageSchema.shape.applications.element),
  pagination: z.object({
    page: z.number().int().positive(),
    pageSize: z.number().int().positive(),
    total: z.number().int().nonnegative()
  })
})

export type AccountEventCertificatesPage = z.infer<typeof accountEventCertificatesPageSchema>
