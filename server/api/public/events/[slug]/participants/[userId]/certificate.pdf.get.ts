import { getRequestURL } from 'h3'

import { getDatabase } from '#server/database/client'
import {
  certificatePreviewQuerySchema,
  certificateRouteParamsSchema,
  getEventCertificateOrThrow,
  getEventCertificatePreview
} from '#server/domains/events/certificates'
import { renderEventCertificatePdf } from '#server/domains/events/certificate-pdf'
import { defineApiHandler } from '#server/http/api-handler'
import { parseValidatedParams, parseValidatedQuery } from '#server/http/validation'
import {
  buildEventCertificatePath,
  eventCertificatePreviewUserId
} from '#shared/domains/events/certificates'

export default defineApiHandler(async (h3Event) => {
  const { slug, userId } = parseValidatedParams(h3Event, certificateRouteParamsSchema)
  const isPreview = userId === eventCertificatePreviewUserId
  const database = getDatabase(h3Event)
  const certificate = isPreview
    ? await getEventCertificatePreview(database, slug, parseValidatedQuery(h3Event, certificatePreviewQuerySchema))
    : await getEventCertificateOrThrow(database, slug, userId)

  const requestUrl = getRequestURL(h3Event)
  const verifyUrl = new URL(buildEventCertificatePath(slug, userId), requestUrl.origin)

  if (isPreview) {
    requestUrl.searchParams.delete('download')
    verifyUrl.search = requestUrl.searchParams.toString()
  }

  const pdf = await renderEventCertificatePdf(certificate, verifyUrl.toString())

  return new Response(pdf.buffer.slice(pdf.byteOffset, pdf.byteOffset + pdf.byteLength) as ArrayBuffer, {
    headers: {
      'content-type': 'application/pdf',
      'cache-control': 'private, no-store',
      'content-disposition': `attachment; filename="certificate-${certificate.eventSlug}.pdf"`,
      'x-content-type-options': 'nosniff'
    }
  })
})
