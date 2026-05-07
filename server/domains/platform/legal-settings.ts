import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import { platformLegalSettings } from '#server/database/schema'

export const platformLegalSettingsId = 'default'

type PlatformLegalSettingsRecord = typeof platformLegalSettings.$inferSelect

export const platformLegalSettingsBodySchema = z.object({
  operatorName: z.string().trim().min(1),
  operatorAddress: z.string().trim().min(1),
  supportEmail: z.string().trim().email(),
  privacyEmail: z.string().trim().email(),
  legalContactLanguages: z.string().trim().min(1),
  businessPurpose: z.string().trim().min(1),
  editorialLine: z.string().trim().min(1),
  imprintContent: z.string().trim().min(1)
})

type PlatformLegalSettingsInput = z.infer<typeof platformLegalSettingsBodySchema>

export function serializePlatformLegalSettings(settings: PlatformLegalSettingsRecord) {
  return {
    id: settings.id,
    operatorName: settings.operatorName,
    operatorAddress: settings.operatorAddress,
    supportEmail: settings.supportEmail,
    privacyEmail: settings.privacyEmail,
    legalContactLanguages: settings.legalContactLanguages,
    businessPurpose: settings.businessPurpose,
    editorialLine: settings.editorialLine,
    imprintContent: settings.imprintContent,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt
  }
}

export async function getPlatformLegalSettings(database: AppDatabase) {
  return await database.query.platformLegalSettings.findFirst({
    where: eq(platformLegalSettings.id, platformLegalSettingsId)
  })
}

export async function upsertPlatformLegalSettings(
  database: AppDatabase,
  input: PlatformLegalSettingsInput,
  actorUserId: string | null
) {
  const now = new Date().toISOString()
  const existingSettings = await getPlatformLegalSettings(database)
  const values = {
    operatorName: input.operatorName,
    operatorAddress: input.operatorAddress,
    supportEmail: input.supportEmail,
    privacyEmail: input.privacyEmail,
    legalContactLanguages: input.legalContactLanguages,
    businessPurpose: input.businessPurpose,
    editorialLine: input.editorialLine,
    imprintContent: input.imprintContent,
    updatedAt: now
  }

  if (existingSettings) {
    await database
      .update(platformLegalSettings)
      .set(values)
      .where(eq(platformLegalSettings.id, platformLegalSettingsId))
  } else {
    await database.insert(platformLegalSettings).values({
      id: platformLegalSettingsId,
      ...values,
      createdAt: now
    })
  }

  await writeAuditLog(database, {
    actorUserId,
    entityType: 'platform_legal_settings',
    entityId: platformLegalSettingsId,
    action: existingSettings ? 'platform_legal_settings.updated' : 'platform_legal_settings.created'
  })

  return (await getPlatformLegalSettings(database))!
}
