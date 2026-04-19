import type { H3Event } from 'h3'

import { describe, expect, test, vi } from 'vitest'

import { ApiError } from '../../../../server/utils/api-error'
import {
  assertValidHackathonPhotoPart,
  buildHackathonPhotoImageUrl,
  createHackathonPhotoPreviewResponse,
  getHackathonPhotoDimensions,
  hackathonPhotoMaxBytes,
  hackathonPhotoObjectKey,
  putHackathonPhotoObject
} from '../../../../server/utils/hackathon-photos'

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
      }
    }
  } as H3Event
}

describe('hackathon photo utilities', () => {
  test('builds canonical protected photo paths', () => {
    expect(hackathonPhotoObjectKey('hackathon_1', 'photo_1')).toBe('hackathons/hackathon_1/photos/photo_1')
    expect(buildHackathonPhotoImageUrl('hackathon_1', 'photo_1', 'preview', '2026-04-19T10:00:00.000Z')).toBe(
      '/api/hackathons/hackathon_1/photos/photo_1/image?variant=preview&v=2026-04-19T10%3A00%3A00.000Z'
    )
  })

  test('accepts supported image signatures and normalizes the optional file name', () => {
    const result = assertValidHackathonPhotoPart({
      type: 'image/gif',
      data: pngSignatureBytes,
      filename: '  gallery-photo.png  '
    })

    expect(result.contentType).toBe('image/png')
    expect(result.fileName).toBe('gallery-photo.png')
  })

  test('rejects unsupported photo bytes', () => {
    expect(() => assertValidHackathonPhotoPart({
      type: 'image/png',
      data: new Uint8Array([1, 2, 3, 4]),
      filename: 'invalid.png'
    })).toThrowError(/JPEG or PNG/)
  })

  test('rejects photo files larger than 10MB', () => {
    expect(() => assertValidHackathonPhotoPart({
      type: 'image/png',
      data: createOversizedPngBytes(hackathonPhotoMaxBytes + 1)
    })).toThrowError(/10MB or smaller/)
  })

  test('requires the Cloudflare Images binding for photo-dimension detection', async () => {
    const event = createEvent({})

    await expect(getHackathonPhotoDimensions(event, pngSignatureBytes)).rejects.toThrowError(ApiError)
    await expect(getHackathonPhotoDimensions(event, pngSignatureBytes)).rejects.toThrowError(/IMAGES/)
  })

  test('returns photo dimensions from the Cloudflare Images binding', async () => {
    const imagesBinding = {
      info: vi.fn(async () => ({ width: 1600, height: 900 })),
      input: vi.fn()
    }
    const event = createEvent({
      IMAGES: imagesBinding
    })

    await expect(getHackathonPhotoDimensions(event, pngSignatureBytes)).resolves.toEqual({
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

    const response = await createHackathonPhotoPreviewResponse(event, {
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
      HACKATHON_IMAGES: bucket
    })

    await putHackathonPhotoObject(event, 'hackathon_1', 'photo_1', {
      contentType: 'image/png',
      data: Buffer.from(pngSignatureBytes) as unknown as Uint8Array
    })

    expect(putCalls).toHaveLength(1)
    expect(Buffer.isBuffer(putCalls[0])).toBe(false)
    expect(putCalls[0]).toBeInstanceOf(Uint8Array)
  })
})
