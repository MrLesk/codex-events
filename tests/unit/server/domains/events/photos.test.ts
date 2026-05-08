import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../../server/http/api-error'
import {
  assertValidEventPhotoPart,
  buildEventPhotoImageUrl,
  buildPublicEventPhotoImageUrl,
  createEventPhotoPreviewResponse,
  getEventPhotoDimensions,
  eventPhotoMaxBytes,
  eventPhotoObjectKey,
  putEventPhotoObject
} from '../../../../../server/domains/events/photos'

const pngSignatureBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function createOversizedPngBytes(size: number) {
  const data = new Uint8Array(size)
  data.set(pngSignatureBytes)
  return data
}

function createEvent(cloudflareEnv: Record<string, unknown>) {
  return {
    context: {
      cloudflare: {
        env: cloudflareEnv
      },
      runtimeConfig: {
        eventImages: {
          publicCdnBaseUrl: ''
        }
      }
    }
  } as H3Event
}

describe('event photo utilities', () => {
  test('builds canonical protected and fallback public photo paths', () => {
    expect(eventPhotoObjectKey('event_1', 'photo_1')).toBe('events/event_1/photos/photo_1')
    expect(buildEventPhotoImageUrl('event_1', 'photo_1', 'preview', '2026-04-19T10:00:00.000Z')).toBe(
      '/api/events/event_1/photos/photo_1/image?variant=preview&v=2026-04-19T10%3A00%3A00.000Z'
    )
    expect(buildPublicEventPhotoImageUrl(
      createEvent({}),
      'event_1',
      'codex-vienna',
      'photo_1',
      'original',
      '2026-04-19T10:00:00.000Z'
    )).toBe(
      '/api/public/events/codex-vienna/photos/photo_1/image?variant=original&v=2026-04-19T10%3A00%3A00.000Z'
    )
  })

  test('builds CDN-backed public photo URLs when a public CDN base URL is configured', () => {
    const event = {
      context: {
        cloudflare: {
          env: {}
        },
        runtimeConfig: {
          eventImages: {
            publicCdnBaseUrl: 'https://cdn.dev.codex-events.com'
          }
        }
      }
    } as H3Event

    expect(buildPublicEventPhotoImageUrl(
      event,
      'event_1',
      'codex-vienna',
      'photo_1',
      'preview',
      '2026-04-19T10:00:00.000Z'
    )).toBe(
      'https://cdn.dev.codex-events.com/cdn-cgi/image/width=720,height=720,fit=scale-down,format=webp,quality=82/events/event_1/photos/photo_1'
    )
    expect(buildPublicEventPhotoImageUrl(
      event,
      'event_1',
      'codex-vienna',
      'photo_1',
      'original',
      '2026-04-19T10:00:00.000Z'
    )).toBe(
      'https://cdn.dev.codex-events.com/events/event_1/photos/photo_1'
    )
  })

  test('accepts supported image signatures and normalizes the optional file name', () => {
    const result = assertValidEventPhotoPart({
      type: 'image/gif',
      data: pngSignatureBytes,
      filename: '  gallery-photo.png  '
    })

    expect(result.contentType).toBe('image/png')
    expect(result.fileName).toBe('gallery-photo.png')
  })

  test('rejects unsupported photo bytes', () => {
    expect(() => assertValidEventPhotoPart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3, 4]),
      filename: 'invalid.png'
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects photo files larger than 10MB', () => {
    expect(() => assertValidEventPhotoPart({
      type: 'image/png',
      data: createOversizedPngBytes(eventPhotoMaxBytes + 1)
    })).toThrowError(/10MB or smaller/)
  })

  test('requires the Cloudflare Images binding for photo-dimension detection', async () => {
    const event = createEvent({})

    await expect(getEventPhotoDimensions(event, pngSignatureBytes)).rejects.toThrowError(ApiError)
    await expect(getEventPhotoDimensions(event, pngSignatureBytes)).rejects.toThrowError(/IMAGES/)
  })

  test('returns photo dimensions from the Cloudflare Images binding', async () => {
    const imagesBinding = {
      info: vi.fn(async () => ({ width: 1600, height: 900 })),
      input: vi.fn()
    }
    const event = createEvent({
      IMAGES: imagesBinding
    })

    await expect(getEventPhotoDimensions(event, pngSignatureBytes)).resolves.toEqual({
      width: 1600,
      height: 900
    })
  })

  test('creates a transformed preview response with private caching headers', async () => {
    const imagesBinding = {
      info: vi.fn(async () => ({ width: 1600, height: 900 })),
      input: vi.fn(() => ({
        transform: vi.fn(() => ({
          output: vi.fn(async () => ({
            response: () => new Response(new Uint8Array([9, 8, 7]), {
              status: 200
            }),
            contentType: () => 'image/webp'
          }))
        }))
      }))
    }
    const event = createEvent({
      IMAGES: imagesBinding
    })

    const response = await createEventPhotoPreviewResponse(event, {
      arrayBuffer: async () => pngSignatureBytes.buffer.slice(
        pngSignatureBytes.byteOffset,
        pngSignatureBytes.byteOffset + pngSignatureBytes.byteLength
      ),
      httpMetadata: {
        contentType: 'image/png'
      }
    })

    expect(response.headers.get('cache-control')).toBe('private, max-age=31536000, immutable')
    expect(response.headers.get('content-type')).toBe('image/webp')
    expect(response.headers.get('vary')).toBe('Cookie')
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([9, 8, 7]))
  })

  test('can create a transformed preview response with public caching headers', async () => {
    const imagesBinding = {
      info: vi.fn(async () => ({ width: 1600, height: 900 })),
      input: vi.fn(() => ({
        transform: vi.fn(() => ({
          output: vi.fn(async () => ({
            response: () => new Response(new Uint8Array([6, 5, 4]), {
              status: 200
            }),
            contentType: () => 'image/webp'
          }))
        }))
      }))
    }
    const event = createEvent({
      IMAGES: imagesBinding
    })

    const response = await createEventPhotoPreviewResponse(event, {
      arrayBuffer: async () => pngSignatureBytes.buffer.slice(
        pngSignatureBytes.byteOffset,
        pngSignatureBytes.byteOffset + pngSignatureBytes.byteLength
      ),
      httpMetadata: {
        contentType: 'image/png'
      }
    }, {
      cacheControl: 'public, max-age=31536000, immutable',
      includeCookieVary: false
    })

    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable')
    expect(response.headers.get('vary')).toBeNull()
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(new Uint8Array([6, 5, 4]))
  })

  test('normalizes Node Buffer payloads before writing photo objects to R2', async () => {
    const putCalls: unknown[] = []
    const bucket = {
      async get() {
        return null
      },
      async put(_key: string, value: unknown) {
        putCalls.push(value)
        return undefined
      },
      async delete() {
        return undefined
      }
    }
    const event = createEvent({
      EVENT_IMAGES: bucket
    })

    await putEventPhotoObject(event, 'event_1', 'photo_1', {
      contentType: 'image/png',
      data: Buffer.from(pngSignatureBytes) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
