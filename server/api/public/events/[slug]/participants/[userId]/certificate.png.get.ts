import { getQuery } from 'h3'

import { getDatabase } from '#server/database/client'
import {
  certificateRouteParamsSchema,
  getEventCertificateOrThrow
} from '#server/domains/events/certificates'
import { renderEventCertificatePng } from '#server/domains/events/certificate-image'
import { defineApiHandler } from '#server/http/api-handler'
import { parseValidatedParams } from '#server/http/validation'

export default defineApiHandler(async (h3Event) => {
  const { slug, userId } = parseValidatedParams(h3Event, certificateRouteParamsSchema)
  const certificate = await getEventCertificateOrThrow(getDatabase(h3Event), slug, userId)
  const png = await renderEventCertificatePng(certificate)

  return new Response(toArrayBuffer(png), {
    headers: {
      'content-type': 'image/png',
      'cache-control': 'public, max-age=300, s-maxage=3600',
      'x-content-type-options': 'nosniff',
      ...(getQuery(h3Event).download !== undefined
        ? { 'content-disposition': `attachment; filename="certificate-${certificate.eventSlug}.png"` }
        : {})
    }
  })
})

function toArrayBuffer(data: Uint8Array) {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer
}
