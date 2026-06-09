import { getRequestURL } from 'h3'

import { requireAuthenticatedActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import {
  certificateRouteParamsSchema,
  getEventCertificateOrThrow
} from '#server/domains/events/certificates'
import { renderEventCertificatePdf } from '#server/domains/events/certificate-pdf'
import { defineApiHandler } from '#server/http/api-handler'
import { parseValidatedParams } from '#server/http/validation'
import { buildEventCertificatePath } from '#shared/domains/events/certificates'

export default defineApiHandler(async (h3Event) => {
  await requireAuthenticatedActor(h3Event)

  const { slug, userId } = parseValidatedParams(h3Event, certificateRouteParamsSchema)
  const certificate = await getEventCertificateOrThrow(getDatabase(h3Event), slug, userId)
  const verifyUrl = new URL(buildEventCertificatePath(slug, userId), getRequestURL(h3Event).origin).toString()
  const pdf = await renderEventCertificatePdf(certificate, verifyUrl)

  return new Response(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, {
    headers: {
      'content-type': 'application/pdf',
      'cache-control': 'private, no-store',
      'content-disposition': `attachment; filename="certificate-${certificate.eventSlug}.pdf"`,
      'x-content-type-options': 'nosniff'
    }
  })
})
