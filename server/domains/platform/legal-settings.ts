import { eq } from 'drizzle-orm'
import { z } from 'zod'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import { platformLegalSettings } from '#server/database/schema'

export const platformLegalSettingsId = 'default'

type PlatformLegalSettingsRecord = typeof platformLegalSettings.$inferSelect

export const platformLegalSettingsBodySchema = z.strictObject({
  supportEmail: z.string().trim().email(),
  imprintContent: z.string().trim().min(1)
})

type PlatformLegalSettingsInput = z.infer<typeof platformLegalSettingsBodySchema>

export function serializePlatformLegalSettings(settings: PlatformLegalSettingsRecord) {
  return {
    id: settings.id,
    supportEmail: settings.supportEmail,
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
    supportEmail: input.supportEmail,
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
