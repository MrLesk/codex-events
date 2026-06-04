import { afterEach, beforeEach, describe, expect, test } from 'vitest'

import { eq } from 'drizzle-orm'

import { createDatabase, type AppDatabase } from '../../../../../server/database/client'
import { auditLogs, platformSettings, users } from '../../../../../server/database/schema'
import {
  clearDefaultEventBackgroundImageUrl,
  getEventDisplayImageOptions,
  resolveEventDisplayBackgroundImageUrl,
  serializePlatformSettings,
  setDefaultEventBackgroundImageUrl
} from '../../../../../server/domains/platform/settings'
import { createTestD1Database, type TestD1Database } from '../../../../support/backend/fake-d1'

describe('platform settings utilities', () => {
  let d1Database: TestD1Database
  let database: AppDatabase

  beforeEach(async () => {
    d1Database = createTestD1Database()
    database = createDatabase(d1Database as never)
    await database.insert(users).values({
      id: 'platform_admin',
      auth0Subject: 'auth0|platform-admin',
      email: 'platform-admin@example.com',
      displayName: 'Platform Admin',
      isPlatformAdmin: true
    })
  })

  afterEach(async () => {
    await d1Database.close()
  })

  test('upserts and serializes the default event background image URL', async () => {
    const created = await setDefaultEventBackgroundImageUrl(
      database,
      'https://example.com/default-background.png',
      'platform_admin'
    )

    expect(serializePlatformSettings(created)).toMatchObject({
      id: 'default',
      defaultEventBackgroundImageUrl: 'https://example.com/default-background.png'
    })
    await expect(getEventDisplayImageOptions(database)).resolves.toEqual({
      defaultEventBackgroundImageUrl: 'https://example.com/default-background.png'
    })

    const auditRows = await database.select().from(auditLogs)
    expect(auditRows).toEqual([
      expect.objectContaining({
        actorUserId: 'platform_admin',
        entityType: 'platform_settings',
        entityId: 'default',
        action: 'platform_settings.created'
      })
    ])
  })

  test('updates the existing default event background image URL', async () => {
    await setDefaultEventBackgroundImageUrl(
      database,
      'https://example.com/default-background.png',
      'platform_admin'
    )

    const updated = await setDefaultEventBackgroundImageUrl(
      database,
      'https://example.com/replacement-background.png',
      'platform_admin'
    )
    const storedSettings = await database.query.platformSettings.findFirst({
      where: eq(platformSettings.id, 'default')
    })
    const auditRows = await database.select().from(auditLogs)

    expect(serializePlatformSettings(updated)).toMatchObject({
      id: 'default',
      defaultEventBackgroundImageUrl: 'https://example.com/replacement-background.png'
    })
    expect(storedSettings).toMatchObject({
      id: 'default',
      defaultEventBackgroundImageUrl: 'https://example.com/replacement-background.png'
    })
    expect(auditRows).toEqual([
      expect.objectContaining({
        action: 'platform_settings.created'
      }),
      expect.objectContaining({
        action: 'platform_settings.updated'
      })
    ])
  })

  test('clears the default event background image URL without deleting the settings row', async () => {
    await setDefaultEventBackgroundImageUrl(
      database,
      'https://example.com/default-background.png',
      'platform_admin'
    )

    const cleared = await clearDefaultEventBackgroundImageUrl(database, 'platform_admin')
    const storedSettings = await database.query.platformSettings.findFirst({
      where: eq(platformSettings.id, 'default')
    })

    expect(cleared).toMatchObject({
      id: 'default',
      defaultEventBackgroundImageUrl: null
    })
    expect(storedSettings).toMatchObject({
      id: 'default',
      defaultEventBackgroundImageUrl: null
    })
  })

  test('resolves event-specific background before the platform default', () => {
    expect(resolveEventDisplayBackgroundImageUrl({
      backgroundImageUrl: 'https://example.com/event-background.png'
    }, {
      defaultEventBackgroundImageUrl: 'https://example.com/default-background.png'
    })).toBe('https://example.com/event-background.png')

    expect(resolveEventDisplayBackgroundImageUrl({
      backgroundImageUrl: null
    }, {
      defaultEventBackgroundImageUrl: 'https://example.com/default-background.png'
    })).toBe('https://example.com/default-background.png')
  })
})
