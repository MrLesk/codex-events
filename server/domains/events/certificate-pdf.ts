import fontkit from '@pdf-lib/fontkit'
import type { PDFFont, PDFImage, PDFPage } from 'pdf-lib'
import { PDFDocument, rgb } from 'pdf-lib'
import qrcode from 'qrcode-generator'

import { loadCertificateFonts } from '#server/domains/events/certificate-fonts'
import type {
  EventCertificate,
  EventCertificateEventType
} from '#shared/domains/events/certificates'
import {
  eventCertificateTypeLabels,
  formatEventCertificatePlacement,
  resolveEventCertificatePlacementTier
} from '#shared/domains/events/certificates'

const pageWidth = 841.89
const pageHeight = 595.28
const pageMargin = 56

interface RgbColor {
  r: number
  g: number
  b: number
}

interface CertificatePdfPalette {
  gradientFrom: RgbColor
  gradientVia: RgbColor
  gradientTo: RgbColor
  accent: ReturnType<typeof rgb>
  accentSoft: ReturnType<typeof rgb>
  dot: ReturnType<typeof rgb>
}

function hexColor(hex: string): RgbColor {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255
  }
}

const certificatePdfPalettes: Record<EventCertificateEventType, CertificatePdfPalette> = {
  build: {
    gradientFrom: hexColor('#0a1186'),
    gradientVia: hexColor('#2f33d8'),
    gradientTo: hexColor('#7a5cf0'),
    accent: rgb(0.81, 0.84, 1),
    accentSoft: rgb(0.77, 0.82, 1),
    dot: rgb(0.59, 0.75, 1)
  },
  hackathon: {
    gradientFrom: hexColor('#560a9b'),
    gradientVia: hexColor('#a519c2'),
    gradientTo: hexColor('#ea4581'),
    accent: rgb(1, 0.85, 0.93),
    accentSoft: rgb(1, 0.81, 0.91),
    dot: rgb(1, 0.63, 0.82)
  },
  meetup: {
    gradientFrom: hexColor('#013f70'),
    gradientVia: hexColor('#0782c3'),
    gradientTo: hexColor('#2cd4c4'),
    accent: rgb(0.79, 0.96, 0.95),
    accentSoft: rgb(0.74, 0.93, 0.92),
    dot: rgb(0.55, 0.92, 0.9)
  }
}

const goldText = rgb(1, 0.91, 0.66)
const goldBorder = rgb(1, 0.84, 0.43)
const goldFill = rgb(0.47, 0.33, 0.05)
const whiteText = rgb(0.99, 0.99, 1)
const mutedText = rgb(0.92, 0.92, 0.98)

let badgePromise: Promise<ArrayBuffer> | null = null

function loadCertificateBadge() {
  badgePromise ??= (async () => {
    const data = await useStorage('assets:server').getItemRaw<Uint8Array>('images/codex-mark-white.png')

    if (!data) {
      throw new Error('Certificate badge asset images/codex-mark-white.png is missing from the server bundle.')
    }

    const bytes = new Uint8Array(data)
    return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer
  })()

  return badgePromise
}

function lerpColor(from: RgbColor, to: RgbColor, ratio: number) {
  return rgb(
    from.r + (to.r - from.r) * ratio,
    from.g + (to.g - from.g) * ratio,
    from.b + (to.b - from.b) * ratio
  )
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

function drawCenteredText(
  page: PDFPage,
  text: string,
  options: { y: number, font: PDFFont, size: number, color: ReturnType<typeof rgb>, opacity?: number }
) {
  page.drawText(text, {
    x: (pageWidth - options.font.widthOfTextAtSize(text, options.size)) / 2,
    y: options.y,
    font: options.font,
    size: options.size,
    color: options.color,
    opacity: options.opacity ?? 1
  })
}

function roundedRectPath(width: number, height: number, radius: number) {
  const r = Math.min(radius, height / 2, width / 2)

  return `M ${r} 0 H ${width - r} A ${r} ${r} 0 0 1 ${width} ${r} V ${height - r} A ${r} ${r} 0 0 1 ${width - r} ${height} H ${r} A ${r} ${r} 0 0 1 0 ${height - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`
}

function drawPill(
  page: PDFPage,
  text: string,
  options: {
    centerX: number
    centerY: number
    font: PDFFont
    size: number
    color: ReturnType<typeof rgb>
    borderColor: ReturnType<typeof rgb>
    borderOpacity: number
    fillColor?: ReturnType<typeof rgb>
    fillOpacity?: number
    paddingX: number
    paddingY: number
  }
) {
  const textWidth = options.font.widthOfTextAtSize(text, options.size)
  const width = textWidth + options.paddingX * 2
  const height = options.size + options.paddingY * 2

  page.drawSvgPath(roundedRectPath(width, height, height / 2), {
    x: options.centerX - width / 2,
    y: options.centerY + height / 2,
    borderColor: options.borderColor,
    borderOpacity: options.borderOpacity,
    borderWidth: 1.2,
    ...(options.fillColor
      ? { color: options.fillColor, opacity: options.fillOpacity ?? 1 }
      : {})
  })

  page.drawText(text, {
    x: options.centerX - textWidth / 2,
    y: options.centerY - options.size * 0.36,
    font: options.font,
    size: options.size,
    color: options.color
  })
}

function drawGradientBackground(page: PDFPage, palette: CertificatePdfPalette) {
  const stripCount = 120
  const stripWidth = pageWidth / stripCount

  for (let index = 0; index < stripCount; index += 1) {
    const ratio = index / (stripCount - 1)
    const color = ratio < 0.5
      ? lerpColor(palette.gradientFrom, palette.gradientVia, ratio * 2)
      : lerpColor(palette.gradientVia, palette.gradientTo, (ratio - 0.5) * 2)

    page.drawRectangle({
      x: index * stripWidth,
      y: 0,
      width: stripWidth + 0.75,
      height: pageHeight,
      color
    })
  }

  page.drawSvgPath(`M 0 0 L 90 0 L 320 ${pageHeight} L 200 ${pageHeight} Z`, {
    x: 250,
    y: pageHeight,
    color: rgb(1, 1, 1),
    opacity: 0.05
  })

  page.drawRectangle({
    x: 0,
    y: 0,
    width: pageWidth,
    height: pageHeight,
    color: rgb(0.02, 0.01, 0.09),
    opacity: 0.22
  })
}

function drawDotField(
  page: PDFPage,
  palette: CertificatePdfPalette,
  options: { x: number, y: number, columns: number, rows: number, spacing: number }
) {
  for (let row = 0; row < options.rows; row += 1) {
    for (let column = 0; column < options.columns; column += 1) {
      page.drawCircle({
        x: options.x + column * options.spacing,
        y: options.y - row * options.spacing,
        size: 1.4,
        color: palette.dot,
        opacity: 0.32
      })
    }
  }
}

function drawRings(page: PDFPage) {
  page.drawCircle({
    x: pageWidth / 2,
    y: 340,
    size: 150,
    borderColor: rgb(1, 1, 1),
    borderOpacity: 0.07,
    borderWidth: 1
  })
  page.drawCircle({
    x: pageWidth / 2,
    y: 340,
    size: 210,
    borderColor: rgb(1, 1, 1),
    borderOpacity: 0.05,
    borderWidth: 1
  })
}

function drawVerificationQrCode(page: PDFPage, verifyUrl: string, options: { x: number, y: number, size: number }) {
  const qr = qrcode(0, 'M')
  qr.addData(verifyUrl)
  qr.make()

  const moduleCount = qr.getModuleCount()
  const quietZone = 7
  const cellSize = (options.size - quietZone * 2) / moduleCount

  page.drawSvgPath(roundedRectPath(options.size, options.size, 8), {
    x: options.x,
    y: options.y + options.size,
    color: rgb(1, 1, 1)
  })

  for (let row = 0; row < moduleCount; row += 1) {
    for (let column = 0; column < moduleCount; column += 1) {
      if (!qr.isDark(row, column)) {
        continue
      }

      page.drawRectangle({
        x: options.x + quietZone + column * cellSize,
        y: options.y + options.size - quietZone - (row + 1) * cellSize,
        width: cellSize,
        height: cellSize,
        color: rgb(0.04, 0.05, 0.08)
      })
    }
  }
}

function drawFooterCells(
  page: PDFPage,
  certificate: EventCertificate,
  fonts: { regular: PDFFont, semiBold: PDFFont },
  availableWidth: number
) {
  const locationLine = [certificate.city, certificate.country].filter(part => part.trim().length > 0).join(', ')
  const cells = [
    { label: 'EVENT TYPE', value: eventCertificateTypeLabels[certificate.eventType] },
    { label: 'EVENT DATE', value: certificate.eventDateLabel },
    ...(locationLine ? [{ label: 'LOCATION', value: locationLine }] : []),
    ...(certificate.trackName ? [{ label: 'TRACK', value: certificate.trackName }] : []),
    { label: 'CERTIFICATE ID', value: certificate.certificateId }
  ]

  const labelSize = 8
  const valueSize = 11
  const widths = cells.map(cell => Math.max(
    fonts.semiBold.widthOfTextAtSize(spacedLabel(cell.label), labelSize),
    fonts.semiBold.widthOfTextAtSize(cell.value, valueSize)
  ))
  const totalWidth = widths.reduce((sum, width) => sum + width, 0)
  const gap = Math.max(18, (availableWidth - totalWidth) / (cells.length - 1))

  let cursor = pageMargin

  cells.forEach((cell, index) => {
    page.drawText(spacedLabel(cell.label), {
      x: cursor,
      y: 112,
      font: fonts.semiBold,
      size: labelSize,
      color: mutedText,
      opacity: 0.75
    })
    page.drawText(cell.value, {
      x: cursor,
      y: 95,
      font: fonts.semiBold,
      size: valueSize,
      color: whiteText
    })

    cursor += widths[index] ?? 0

    if (index < cells.length - 1) {
      page.drawLine({
        start: { x: cursor + gap / 2, y: 92 },
        end: { x: cursor + gap / 2, y: 122 },
        thickness: 1,
        color: rgb(1, 1, 1),
        opacity: 0.22
      })
      cursor += gap
    }
  })
}

export async function renderEventCertificatePdf(certificate: EventCertificate, verifyUrl: string) {
  const palette = certificatePdfPalettes[certificate.eventType]
  const [fonts, badgeBytes] = await Promise.all([loadCertificateFonts(), loadCertificateBadge()])

  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  document.setTitle(`Certificate of Participation - ${certificate.eventName}`)
  document.setSubject(`${certificate.participantName} has participated in ${certificate.eventName}`)
  document.setAuthor('Codex Events')

  const regular = await document.embedFont(fonts.regular, { subset: true })
  const semiBold = await document.embedFont(fonts.semiBold, { subset: true })
  const badge: PDFImage = await document.embedPng(badgeBytes)
  const page = document.addPage([pageWidth, pageHeight])

  drawGradientBackground(page, palette)
  drawDotField(page, palette, { x: 64, y: pageHeight - 64, columns: 14, rows: 9, spacing: 13 })
  drawDotField(page, palette, { x: pageWidth - 64 - 13 * 13, y: 64 + 8 * 13, columns: 14, rows: 9, spacing: 13 })
  drawRings(page)

  page.drawSvgPath(roundedRectPath(pageWidth - 40, pageHeight - 40, 18), {
    x: 20,
    y: pageHeight - 20,
    borderColor: palette.accentSoft,
    borderOpacity: 0.55,
    borderWidth: 1.4
  })

  page.drawText(spacedLabel('Codex Events'), {
    x: pageMargin,
    y: pageHeight - 92,
    font: semiBold,
    size: 17,
    color: whiteText
  })

  const typePillLabel = spacedLabel(eventCertificateTypeLabels[certificate.eventType])
  const typePillWidth = semiBold.widthOfTextAtSize(typePillLabel, 10) + 36
  drawPill(page, typePillLabel, {
    centerX: pageWidth - pageMargin - typePillWidth / 2,
    centerY: pageHeight - 86,
    font: semiBold,
    size: 10,
    color: palette.accent,
    borderColor: palette.accentSoft,
    borderOpacity: 0.65,
    paddingX: 18,
    paddingY: 7
  })

  const badgeSize = 96
  page.drawImage(badge, {
    x: pageWidth - pageMargin - badgeSize - 12,
    y: 318,
    width: badgeSize,
    height: badgeSize,
    opacity: 0.95
  })

  const placementTier = certificate.placement ? resolveEventCertificatePlacementTier(certificate.placement) : null

  if (certificate.placement && placementTier) {
    drawPill(page, spacedLabel(formatEventCertificatePlacement(certificate.placement)), {
      centerX: pageWidth / 2,
      centerY: 446,
      font: semiBold,
      size: 10,
      color: goldText,
      borderColor: goldBorder,
      borderOpacity: 0.8,
      fillColor: goldFill,
      fillOpacity: 0.55,
      paddingX: 20,
      paddingY: 7
    })
  }

  drawCenteredText(page, spacedLabel('Certificate of Participation'), {
    y: 408,
    font: semiBold,
    size: 12,
    color: mutedText,
    opacity: 0.9
  })

  const nameMaxWidth = pageWidth - pageMargin * 2 - (badgeSize + 36) * 2
  const nameSize = fitFontSize(semiBold, certificate.participantName.toUpperCase(), nameMaxWidth, 40, 18)
  drawCenteredText(page, certificate.participantName.toUpperCase(), {
    y: 352,
    font: semiBold,
    size: nameSize,
    color: whiteText
  })

  drawCenteredText(page, 'has participated in', {
    y: 322,
    font: regular,
    size: 12,
    color: mutedText,
    opacity: 0.85
  })

  const eventLabel = spacedLabel(certificate.eventName)
  const eventLabelSize = fitFontSize(semiBold, eventLabel, pageWidth - pageMargin * 2 - 200, 13, 8)
  drawPill(page, eventLabel, {
    centerX: pageWidth / 2,
    centerY: 284,
    font: semiBold,
    size: eventLabelSize,
    color: whiteText,
    borderColor: rgb(1, 1, 1),
    borderOpacity: 0.55,
    paddingX: 26,
    paddingY: 10
  })

  if (certificate.placement) {
    drawCenteredText(page, [formatEventCertificatePlacement(certificate.placement), ...certificate.prizes].join(' · '), {
      y: 236,
      font: semiBold,
      size: 13,
      color: goldText
    })
  }

  const teamLine = [
    certificate.projectName,
    certificate.teamName ? `Team ${certificate.teamName}` : ''
  ].filter(part => part).join(' · ')

  if (teamLine) {
    drawCenteredText(page, teamLine, {
      y: certificate.placement ? 214 : 236,
      font: regular,
      size: 11,
      color: mutedText,
      opacity: 0.85
    })
  }

  page.drawLine({
    start: { x: pageMargin, y: 146 },
    end: { x: pageWidth - pageMargin, y: 146 },
    thickness: 1,
    color: rgb(1, 1, 1),
    opacity: 0.18
  })

  const qrSize = 74
  drawFooterCells(page, certificate, { regular, semiBold }, pageWidth - pageMargin * 2 - qrSize - 28)
  drawVerificationQrCode(page, verifyUrl, {
    x: pageWidth - pageMargin - qrSize,
    y: 58,
    size: qrSize
  })

  page.drawText(`Verify at ${verifyUrl}`, {
    x: pageMargin,
    y: 56,
    font: regular,
    size: 9.5,
    color: mutedText,
    opacity: 0.8
  })

  return document.save()
}
