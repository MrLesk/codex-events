import { eq } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import { platformSettings } from '#server/database/schema'

export const platformSettingsId = 'default'

type PlatformSettingsRecord = typeof platformSettings.$inferSelect

export interface EventDisplayImageOptions {
  defaultEventBackgroundImageUrl?: string | null
}

export function serializePlatformSettings(settings: PlatformSettingsRecord) {
  return {
    id: settings.id,
    defaultEventBackgroundImageUrl: settings.defaultEventBackgroundImageUrl,
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt
  }
}

export function resolveEventDisplayBackgroundImageUrl(
  event: { backgroundImageUrl: string | null },
  options: EventDisplayImageOptions = {}
) {
  const eventBackgroundImageUrl = event.backgroundImageUrl?.trim()

  if (eventBackgroundImageUrl) {
    return eventBackgroundImageUrl
  }

  const defaultEventBackgroundImageUrl = options.defaultEventBackgroundImageUrl?.trim()
  return defaultEventBackgroundImageUrl || null
}

export async function getPlatformSettings(database: AppDatabase) {
  return await database.query.platformSettings.findFirst({
    where: eq(platformSettings.id, platformSettingsId)
  })
}

export async function getEventDisplayImageOptions(database: AppDatabase): Promise<EventDisplayImageOptions> {
  const settings = await getPlatformSettings(database)

  return {
    defaultEventBackgroundImageUrl: settings?.defaultEventBackgroundImageUrl ?? null
  }
}

export async function setDefaultEventBackgroundImageUrl(
  database: AppDatabase,
  defaultEventBackgroundImageUrl: string,
  actorUserId: string
) {
  const now = new Date().toISOString()
  const existingSettings = await getPlatformSettings(database)
  const values = {
    defaultEventBackgroundImageUrl,
    updatedAt: now
  }

  if (existingSettings) {
    await database
      .update(platformSettings)
      .set(values)
      .where(eq(platformSettings.id, platformSettingsId))
  } else {
    await database.insert(platformSettings).values({
      id: platformSettingsId,
      ...values,
      createdAt: now
    })
  }

  await writeAuditLog(database, {
    actorUserId,
    entityType: 'platform_settings',
    entityId: platformSettingsId,
    action: existingSettings ? 'platform_settings.updated' : 'platform_settings.created',
    metadata: {
      fields: ['defaultEventBackgroundImageUrl']
    }
  })

  return (await getPlatformSettings(database))!
}

export async function clearDefaultEventBackgroundImageUrl(
  database: AppDatabase,
  actorUserId: string
) {
  const existingSettings = await getPlatformSettings(database)

  if (!existingSettings) {
    return null
  }

  await database
    .update(platformSettings)
    .set({
      defaultEventBackgroundImageUrl: null,
      updatedAt: new Date().toISOString()
    })
    .where(eq(platformSettings.id, platformSettingsId))

  await writeAuditLog(database, {
    actorUserId,
    entityType: 'platform_settings',
    entityId: platformSettingsId,
    action: 'platform_settings.updated',
    metadata: {
      fields: ['defaultEventBackgroundImageUrl']
    }
  })

  return (await getPlatformSettings(database))!
}
