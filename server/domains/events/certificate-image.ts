import { Resvg, initWasm as initResvgWasm } from '@resvg/resvg-wasm'
import satori, { init as initSatori } from 'satori/wasm'
import initYoga from 'yoga-wasm-web'

import { loadCertificateFonts } from '#server/domains/events/certificate-fonts'
import { resvgWasmModule, yogaWasmModule } from '#server/domains/events/certificate-wasm.mjs'
import type {
  EventCertificate,
  EventCertificateEventType
} from '#shared/domains/events/certificates'
import { eventCertificateTypeLabels } from '#shared/domains/events/certificates'

export const certificateImageWidth = 1200
export const certificateImageHeight = 630

interface CertificatePalette {
  backgroundFrom: string
  backgroundVia: string
  backgroundTo: string
  glowLeft: string
  glowRight: string
  accent: string
  frame: string
  dot: string
}

const certificatePalettes: Record<EventCertificateEventType, CertificatePalette> = {
  build: {
    backgroundFrom: '#0a1186',
    backgroundVia: '#4a22c9',
    backgroundTo: '#a23ee6',
    glowLeft: 'rgba(48, 92, 255, 0.5)',
    glowRight: 'rgba(214, 80, 244, 0.5)',
    accent: '#cfd6ff',
    frame: 'rgba(196, 208, 255, 0.65)',
    dot: 'rgba(150, 190, 255, 0.55)'
  },
  hackathon: {
    backgroundFrom: '#470c8f',
    backgroundVia: '#7c1fc2',
    backgroundTo: '#cc3680',
    glowLeft: 'rgba(157, 78, 255, 0.55)',
    glowRight: 'rgba(255, 94, 161, 0.5)',
    accent: '#f0d4ff',
    frame: 'rgba(238, 204, 255, 0.6)',
    dot: 'rgba(255, 170, 220, 0.5)'
  },
  meetup: {
    backgroundFrom: '#024a87',
    backgroundVia: '#0b6dbd',
    backgroundTo: '#2fadd6',
    glowLeft: 'rgba(40, 150, 255, 0.55)',
    glowRight: 'rgba(94, 224, 255, 0.5)',
    accent: '#d2f1ff',
    frame: 'rgba(196, 235, 255, 0.6)',
    dot: 'rgba(150, 220, 255, 0.55)'
  }
}

interface CertificateImageNode {
  type: 'div'
  props: {
    style: Record<string, string | number>
    children?: CertificateImageNode[] | string
  }
}

function box(style: Record<string, string | number>, children?: CertificateImageNode[] | string): CertificateImageNode {
  return {
    type: 'div',
    props: {
      style: { display: 'flex', ...style },
      children
    }
  }
}

let rendererReadyPromise: Promise<void> | null = null

function ensureCertificateRendererReady() {
  rendererReadyPromise ??= (async () => {
    const yoga = await initYoga(yogaWasmModule as never)
    initSatori(yoga)
    await initResvgWasm(resvgWasmModule)
  })()

  return rendererReadyPromise
}

function clampLine(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trimEnd()}…` : value
}

function resolveNameFontSize(name: string) {
  if (name.length <= 14) {
    return 92
  }

  if (name.length <= 22) {
    return 72
  }

  if (name.length <= 32) {
    return 56
  }

  return 44
}

function dotsLayer(style: Record<string, string | number>, dotColor: string) {
  return box({
    position: 'absolute',
    backgroundImage: `radial-gradient(circle at 4px 4px, ${dotColor} 2.4px, rgba(0, 0, 0, 0) 2.6px)`,
    backgroundSize: '18px 18px',
    ...style
  })
}

function footerCell(label: string, value: string, accent: string, withDivider: boolean) {
  return box({
    flexDirection: 'column',
    gap: 7,
    paddingRight: 44,
    marginRight: 44,
    ...(withDivider
      ? {
          borderRight: '1px solid rgba(255, 255, 255, 0.28)'
        }
      : {})
  }, [
    box({ fontSize: 15, fontWeight: 600, letterSpacing: 4, color: 'rgba(255, 255, 255, 0.62)' }, label),
    box({ fontSize: 22, fontWeight: 600, color: accent }, value)
  ])
}

function buildCertificateImageTree(certificate: EventCertificate) {
  const palette = certificatePalettes[certificate.eventType]
  const participantName = clampLine(certificate.participantName, 42).toUpperCase()
  const eventName = clampLine(certificate.eventName, 44).toUpperCase()

  return box({
    width: certificateImageWidth,
    height: certificateImageHeight,
    backgroundColor: '#06070d',
    backgroundImage: `linear-gradient(112deg, ${palette.backgroundFrom} 0%, ${palette.backgroundVia} 48%, ${palette.backgroundTo} 100%)`,
    fontFamily: 'Inter',
    color: '#ffffff'
  }, [
    box({
      position: 'absolute',
      top: -260,
      left: -200,
      width: 560,
      height: 560,
      borderRadius: 9999,
      backgroundImage: `radial-gradient(circle at center, ${palette.glowLeft} 0%, rgba(0, 0, 0, 0) 65%)`
    }),
    box({
      position: 'absolute',
      bottom: -300,
      right: -200,
      width: 600,
      height: 600,
      borderRadius: 9999,
      backgroundImage: `radial-gradient(circle at center, ${palette.glowRight} 0%, rgba(0, 0, 0, 0) 66%)`
    }),
    box({
      position: 'absolute',
      top: -340,
      left: 250,
      width: 230,
      height: 1300,
      backgroundImage: 'linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.22) 50%, rgba(255, 255, 255, 0) 100%)',
      transform: 'rotate(36deg)'
    }),
    dotsLayer({ top: 44, left: 44, width: 270, height: 180, opacity: 0.85 }, palette.dot),
    dotsLayer({ bottom: 44, right: 44, width: 300, height: 200, opacity: 0.7 }, palette.dot),
    box({
      position: 'absolute',
      top: 22,
      left: 22,
      width: certificateImageWidth - 44,
      height: certificateImageHeight - 44,
      border: `2px solid ${palette.frame}`,
      borderRadius: 30
    }),
    box({
      flexDirection: 'column',
      width: certificateImageWidth,
      height: certificateImageHeight,
      padding: '58px 76px'
    }, [
      box({ alignItems: 'center', justifyContent: 'space-between', width: '100%' }, [
        box({ fontSize: 21, fontWeight: 600, letterSpacing: 7 }, 'CODEX EVENTS'),
        box({
          border: `1.5px solid ${palette.frame}`,
          borderRadius: 9999,
          padding: '8px 24px',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: 5,
          color: palette.accent
        }, eventCertificateTypeLabels[certificate.eventType].toUpperCase())
      ]),
      box({
        flexDirection: 'column',
        alignItems: 'center',
        marginTop: 'auto',
        marginBottom: 'auto',
        width: '100%'
      }, [
        box({ fontSize: 19, fontWeight: 600, letterSpacing: 8, color: 'rgba(255, 255, 255, 0.85)' }, 'CERTIFICATE OF PARTICIPATION'),
        box({
          marginTop: 22,
          fontSize: resolveNameFontSize(participantName),
          fontWeight: 600,
          letterSpacing: 3,
          textAlign: 'center',
          backgroundImage: 'linear-gradient(180deg, #ffffff 18%, #dfe6ff 55%, #b9c4ff 100%)',
          backgroundClip: 'text',
          color: 'transparent'
        }, participantName),
        box({
          marginTop: 26,
          border: '1.5px solid rgba(255, 255, 255, 0.55)',
          borderRadius: 9999,
          padding: '11px 34px',
          fontSize: 19,
          fontWeight: 600,
          letterSpacing: 6,
          color: 'rgba(255, 255, 255, 0.92)'
        }, eventName)
      ]),
      box({ alignItems: 'flex-end', width: '100%' }, [
        footerCell('EVENT DATE', certificate.eventDateLabel, '#ffffff', true),
        ...(certificate.trackName
          ? [footerCell('TRACK', clampLine(certificate.trackName, 24), '#ffffff', true)]
          : []),
        footerCell('CERTIFICATE ID', certificate.certificateId, palette.accent, false)
      ])
    ])
  ])
}

export async function renderEventCertificatePng(certificate: EventCertificate) {
  await ensureCertificateRendererReady()
  const fonts = await loadCertificateFonts()

  const svg = await satori(buildCertificateImageTree(certificate), {
    width: certificateImageWidth,
    height: certificateImageHeight,
    fonts: [
      { name: 'Inter', data: fonts.regular, weight: 400, style: 'normal' },
      { name: 'Inter', data: fonts.semiBold, weight: 600, style: 'normal' }
    ]
  })

  const resvg = new Resvg(svg, {
    fitTo: { mode: 'original' }
  })

  return resvg.render().asPng()
}
