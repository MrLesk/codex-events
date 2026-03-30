import type { EventHandler } from 'h3'

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createApp, createRouter, eventHandler, toWebHandler } from 'h3'

async function loadMiddlewareModule() {
  return await import('../../../../server/middleware/00.security-headers')
}

describe('security headers middleware', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubGlobal('defineEventHandler', ((handler: EventHandler) => handler) as typeof defineEventHandler)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  test('builds baseline headers and adds HSTS only in production', async () => {
    const { baselineSecurityHeaders, buildSecurityHeaders } = await loadMiddlewareModule()

    expect(buildSecurityHeaders()).toEqual(baselineSecurityHeaders)
    expect(buildSecurityHeaders({
      isProduction: true
    })).toEqual({
      ...baselineSecurityHeaders,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    })
  })

  test('applies baseline headers to object and Response handlers outside production', async () => {
    vi.stubEnv('NODE_ENV', 'test')
    const { default: securityHeadersMiddleware } = await loadMiddlewareModule()
    const app = createApp()
    const router = createRouter()

    app.use(securityHeadersMiddleware)
    router.get('/object', eventHandler(() => ({ ok: true })))
    router.get('/response', eventHandler(() => new Response('ok')))
    app.use(router)

    const handleRequest = toWebHandler(app)
    const objectResponse = await handleRequest(new Request('http://localhost/object'))
    const responseResponse = await handleRequest(new Request('http://localhost/response'))

    for (const response of [objectResponse, responseResponse]) {
      expect(response.headers.get('x-content-type-options')).toBe('nosniff')
      expect(response.headers.get('x-frame-options')).toBe('DENY')
      expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin')
      expect(response.headers.get('permissions-policy')).toBe('camera=(), microphone=(), geolocation=()')
      expect(response.headers.get('strict-transport-security')).toBeNull()
    }
  })

  test('adds HSTS in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { default: securityHeadersMiddleware } = await loadMiddlewareModule()
    const app = createApp()
    const router = createRouter()

    app.use(securityHeadersMiddleware)
    router.get('/health', eventHandler(() => ({ ok: true })))
    app.use(router)

    const handleRequest = toWebHandler(app)
    const response = await handleRequest(new Request('http://localhost/health'))

    expect(response.headers.get('strict-transport-security')).toBe('max-age=31536000; includeSubDomains')
  })
})
