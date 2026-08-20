import { and, eq, isNull, sql } from 'drizzle-orm'

import { writeAuditLog } from '#server/database/audit-log'
import type { AppDatabase } from '#server/database/client'
import { platformSettings } from '#server/database/schema'
import { assertGuard } from '#server/domains/lifecycle-guard'
import {
  buildVersionedPublicEventImageUrl,
  isManagedPublicEventImageUrl,
  normalizeManagedPublicEventImageUrlForSlug,
  serializeManagedPublicEventImageUrl
} from '#server/domains/events/images'

export const platformSettingsId = 'default'

type PlatformSettingsRecord = typeof platformSettings.$inferSelect

export interface EventDisplayImageOptions {
  defaultEventBackgroundImageUrl?: string | null
  defaultEventBackgroundImageObjectKey?: string | null
  defaultEventBackgroundImageRevision?: number | null
}

export interface PlatformDefaultEventBackgroundImageExpectation {
  revision: number
  objectKey: string | null
}

export function serializePlatformSettings(settings: PlatformSettingsRecord) {
  const defaultEventBackgroundImageUrl = serializeManagedPublicEventImageUrl(
    settings.defaultEventBackgroundImageUrl,
    settings.defaultEventBackgroundImageObjectKey,
    settings.defaultEventBackgroundImageRevision,
    'background'
  )

  return {
    id: settings.id,
    defaultEventBackgroundImageUrl,
    defaultEventBackgroundImageRevision: settings.defaultEventBackgroundImageRevision,
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

export function resolveVersionedEventDisplayBackgroundImageUrl(
  event: {
    backgroundImageUrl: string | null
    slug?: string | null
    backgroundImageObjectKey?: string | null
    backgroundImageRevision?: number | null
  },
  options: EventDisplayImageOptions = {}
) {
  const eventBackgroundImageUrl = event.slug
    ? normalizeManagedPublicEventImageUrlForSlug(event.backgroundImageUrl, event.slug, 'background')
    : event.backgroundImageUrl?.trim()

  if (eventBackgroundImageUrl) {
    if (!isManagedPublicEventImageUrl(eventBackgroundImageUrl)) {
      return eventBackgroundImageUrl
    }

    return event.backgroundImageObjectKey && event.backgroundImageRevision && event.backgroundImageRevision > 0
      ? buildVersionedPublicEventImageUrl(
          eventBackgroundImageUrl,
          event.backgroundImageRevision,
          'background'
        )
      : null
  }

  const defaultEventBackgroundImageUrl = options.defaultEventBackgroundImageUrl?.trim()

  if (!defaultEventBackgroundImageUrl) {
    return null
  }

  if (!isManagedPublicEventImageUrl(defaultEventBackgroundImageUrl)) {
    return defaultEventBackgroundImageUrl
  }

  return options.defaultEventBackgroundImageObjectKey
    && options.defaultEventBackgroundImageRevision
    && options.defaultEventBackgroundImageRevision > 0
    ? buildVersionedPublicEventImageUrl(
        defaultEventBackgroundImageUrl,
        options.defaultEventBackgroundImageRevision,
        'background'
      )
    : null
}

export async function getPlatformSettings(database: AppDatabase) {
  return await database.query.platformSettings.findFirst({
    where: eq(platformSettings.id, platformSettingsId)
  })
}

export async function getEventDisplayImageOptions(database: AppDatabase): Promise<EventDisplayImageOptions> {
  const settings = await getPlatformSettings(database)

  return {
    defaultEventBackgroundImageUrl: settings?.defaultEventBackgroundImageUrl ?? null,
    defaultEventBackgroundImageObjectKey: settings?.defaultEventBackgroundImageObjectKey ?? null,
    defaultEventBackgroundImageRevision: settings?.defaultEventBackgroundImageRevision ?? null
  }
}

export async function setDefaultEventBackgroundImageUrl(
  database: AppDatabase,
  defaultEventBackgroundImageUrl: string,
  defaultEventBackgroundImageObjectKey: string,
  actorUserId: string,
  expected: PlatformDefaultEventBackgroundImageExpectation
) {
  const now = new Date().toISOString()
  const existingSettings = await getPlatformSettings(database)
  const values = {
    defaultEventBackgroundImageUrl,
    defaultEventBackgroundImageObjectKey,
    updatedAt: now
  }

  if (existingSettings) {
    const [updatedSettings] = await database
      .update(platformSettings)
      .set({
        ...values,
        defaultEventBackgroundImageRevision: sql`${platformSettings.defaultEventBackgroundImageRevision} + 1`
      })
      .where(and(
        eq(platformSettings.id, platformSettingsId),
        eq(platformSettings.defaultEventBackgroundImageRevision, expected.revision),
        expected.objectKey
          ? eq(platformSettings.defaultEventBackgroundImageObjectKey, expected.objectKey)
          : isNull(platformSettings.defaultEventBackgroundImageObjectKey)
      ))
      .returning({ id: platformSettings.id })

    assertGuard(Boolean(updatedSettings), {
      statusCode: 409,
      code: 'platform_default_event_background_image_changed',
      message: 'The platform default event background image changed while this request was in progress.'
    })
  } else {
    const [insertedSettings] = await database
      .insert(platformSettings)
      .values({
        id: platformSettingsId,
        ...values,
        defaultEventBackgroundImageRevision: 1,
        createdAt: now
      })
      .onConflictDoNothing({ target: platformSettings.id })
      .returning({ id: platformSettings.id })

    assertGuard(Boolean(insertedSettings), {
      statusCode: 409,
      code: 'platform_default_event_background_image_changed',
      message: 'The platform default event background image changed while this request was in progress.'
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
  actorUserId: string,
  expected: PlatformDefaultEventBackgroundImageExpectation
) {
  const existingSettings = await getPlatformSettings(database)

  if (!existingSettings) {
    return null
  }

  const [updatedSettings] = await database
    .update(platformSettings)
    .set({
      defaultEventBackgroundImageUrl: null,
      defaultEventBackgroundImageObjectKey: null,
      updatedAt: new Date().toISOString(),
      defaultEventBackgroundImageRevision: sql`${platformSettings.defaultEventBackgroundImageRevision} + 1`
    })
    .where(and(
      eq(platformSettings.id, platformSettingsId),
      eq(platformSettings.defaultEventBackgroundImageRevision, expected.revision),
      expected.objectKey
        ? eq(platformSettings.defaultEventBackgroundImageObjectKey, expected.objectKey)
        : isNull(platformSettings.defaultEventBackgroundImageObjectKey)
    ))
    .returning({ id: platformSettings.id })

  assertGuard(Boolean(updatedSettings), {
    statusCode: 409,
    code: 'platform_default_event_background_image_changed',
    message: 'The platform default event background image changed while this request was in progress.'
  })

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
