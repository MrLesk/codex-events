import type { H3Event } from 'h3'

import { setHeader } from 'h3'

export const baselineSecurityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()'
} as const

export function buildSecurityHeaders(options?: {
  isProduction?: boolean
}) {
  return {
    ...baselineSecurityHeaders,
    ...(options?.isProduction
      ? {
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
        }
      : {})
  }
}

function isProductionRuntime() {
  return typeof process !== 'undefined' && process.env.NODE_ENV === 'production'
}

export default defineEventHandler((event: H3Event) => {
  const headers = buildSecurityHeaders({
    isProduction: isProductionRuntime()
  })

  for (const [name, value] of Object.entries(headers)) {
    setHeader(event, name, value)
  }
})
