import fontkit from '@pdf-lib/fontkit'
import type { PDFFont, PDFPage } from 'pdf-lib'
import { PDFDocument, rgb } from 'pdf-lib'

import { loadCertificateFonts } from '#server/domains/events/certificate-fonts'
import type {
  EventCertificate,
  EventCertificateEventType
} from '#shared/domains/events/certificates'
import {
  eventCertificateTypeLabels,
  formatEventCertificatePlacement
} from '#shared/domains/events/certificates'

const pageWidth = 841.89
const pageHeight = 595.28
const pageMargin = 64

interface CertificatePdfPalette {
  background: ReturnType<typeof rgb>
  accent: ReturnType<typeof rgb>
  text: ReturnType<typeof rgb>
  mutedText: ReturnType<typeof rgb>
}

const certificatePdfPalettes: Record<EventCertificateEventType, CertificatePdfPalette> = {
  hackathon: {
    background: rgb(0.055, 0.04, 0.105),
    accent: rgb(0.77, 0.71, 0.99),
    text: rgb(0.957, 0.961, 0.969),
    mutedText: rgb(0.65, 0.66, 0.71)
  },
  build: {
    background: rgb(0.05, 0.055, 0.065),
    accent: rgb(0.905, 0.922, 0.949),
    text: rgb(0.957, 0.961, 0.969),
    mutedText: rgb(0.65, 0.66, 0.71)
  },
  meetup: {
    background: rgb(0.085, 0.063, 0.04),
    accent: rgb(0.914, 0.812, 0.624),
    text: rgb(0.957, 0.961, 0.969),
    mutedText: rgb(0.65, 0.66, 0.71)
  }
}

function spacedLabel(value: string) {
  return value.toUpperCase().split('').join(' ')
}

function fitFontSize(font: PDFFont, text: string, maxWidth: number, preferredSize: number, minimumSize: number) {
  let size = preferredSize

  while (size > minimumSize && font.widthOfTextAtSize(text, size) > maxWidth) {
    size -= 1
  }

  return size
}

function drawRightAlignedText(
  page: PDFPage,
  text: string,
  options: { y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb> }
) {
  page.drawText(text, {
    x: pageWidth - pageMargin - options.font.widthOfTextAtSize(text, options.size),
    y: options.y,
    font: options.font,
    size: options.size,
    color: options.color
  })
}

export async function renderEventCertificatePdf(certificate: EventCertificate, verifyUrl: string) {
  const palette = certificatePdfPalettes[certificate.eventType]
  const fonts = await loadCertificateFonts()

  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  document.setTitle(`Certificate of Participation - ${certificate.eventName}`)
  document.setSubject(`${certificate.participantName} has participated in ${certificate.eventName}`)
  document.setAuthor('Codex Events')

  const regular = await document.embedFont(fonts.regular, { subset: true })
  const semiBold = await document.embedFont(fonts.semiBold, { subset: true })
  const page = document.addPage([pageWidth, pageHeight])
  const contentWidth = pageWidth - pageMargin * 2

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: palette.background
  })

  page.drawRectangle({
    x: 28,
    y: 28,
    width: pageWidth - 56,
    height: pageHeight - 56,
    borderColor: palette.accent,
    borderOpacity: 0.35,
    borderWidth: 1
  })

  page.drawText(spacedLabel('Codex Events'), {
    x: pageMargin,
    y: pageHeight - 102,
    font: semiBold,
    size: 13,
    color: palette.text
  })

  drawRightAlignedText(page, spacedLabel(eventCertificateTypeLabels[certificate.eventType]), {
    y: pageHeight - 102,
    font: semiBold,
    size: 13,
    color: palette.accent
  })

  page.drawText(spacedLabel('Certificate of Participation'), {
    x: pageMargin,
    y: 358,
    font: semiBold,
    size: 12,
    color: palette.accent,
    opacity: 0.75
  })

  const nameSize = fitFontSize(semiBold, certificate.participantName, contentWidth, 44, 20)
  page.drawText(certificate.participantName, {
    x: pageMargin,
    y: 358 - 24 - nameSize,
    font: semiBold,
    size: nameSize,
    color: palette.text
  })

  page.drawText('has participated in', {
    x: pageMargin,
    y: 358 - 24 - nameSize - 34,
    font: regular,
    size: 14,
    color: palette.mutedText
  })

  const eventNameSize = fitFontSize(semiBold, certificate.eventName, contentWidth, 24, 14)
  page.drawText(certificate.eventName, {
    x: pageMargin,
    y: 358 - 24 - nameSize - 34 - 12 - eventNameSize,
    font: semiBold,
    size: eventNameSize,
    color: palette.accent
  })

  page.drawLine({
    start: { x: pageMargin, y: 140 },
    end: { x: pageWidth - pageMargin, y: 140 },
    thickness: 1,
    color: palette.text,
    opacity: 0.14
  })

  const locationLine = [certificate.city, certificate.country].filter(part => part.trim().length > 0).join(', ')
  const footerLines = [
    `${certificate.eventDateLabel}${locationLine ? ` · ${locationLine}` : ''}`,
    ...(certificate.placement
      ? [`${formatEventCertificatePlacement(certificate.placement)}${certificate.prizes.length > 0 ? ` · ${certificate.prizes.join(', ')}` : ''}`]
      : []),
    ...(certificate.trackName ? [`Track · ${certificate.trackName}`] : []),
    `Verify at ${verifyUrl}`
  ]

  footerLines.forEach((line, index) => {
    page.drawText(line, {
      x: pageMargin,
      y: 112 - index * 22,
      font: regular,
      size: 12,
      color: palette.mutedText
    })
  })

  drawRightAlignedText(page, certificate.certificateId, {
    y: 112,
    font: semiBold,
    size: 12,
    color: palette.accent
  })

  return document.save()
}
