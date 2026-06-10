import { describe, expect, test } from 'vitest'

import {
  buildEventCertificateId,
  buildEventCertificatePath,
  buildEventCertificateSummary,
  formatEventCertificateDate,
  formatEventCertificatePlacement,
  resolveEventCertificateDateIso,
  resolveEventCertificatePlacementTier
} from '../../../../../shared/domains/events/certificates'

describe('event certificate helpers', () => {
  test('resolves the earliest agenda start as the certificate date', () => {
    const dateIso = resolveEventCertificateDateIso(
      [
        { startsAt: '2026-06-20T12:00:00.000Z' },
        { startsAt: '2026-06-20T08:30:00.000Z' },
        { startsAt: 'not-a-date' }
      ],
      '2026-06-20T07:00:00.000Z'
    )

    expect(dateIso).toBe('2026-06-20T08:30:00.000Z')
  })

  test('falls back to the submission window start when no agenda items exist', () => {
    expect(resolveEventCertificateDateIso([], '2026-06-20T07:00:00.000Z')).toBe('2026-06-20T07:00:00.000Z')
  })

  test('formats the certificate date in UTC regardless of local timezone', () => {
    expect(formatEventCertificateDate('2026-06-20T23:30:00.000Z')).toBe('June 20, 2026')
  })

  test('derives a readable certificate id from event and participant details', () => {
    expect(buildEventCertificateId({
      eventType: 'build',
      city: 'Vienna',
      eventDateIso: '2026-06-20T08:30:00.000Z',
      participantName: 'Sara Novák',
      applicationId: '1a2b3c4d-5e6f-4a1b-8c2d-9e0f1a2b3c4d'
    })).toBe('BLD-VIE-2026-0620-SNOVAK')

    expect(buildEventCertificateId({
      eventType: 'hackathon',
      city: 'Vienna',
      eventDateIso: '2026-05-02T08:00:00.000Z',
      participantName: 'Alexander Brandstetter-Williams',
      applicationId: '1a2b3c4d-5e6f-4a1b-8c2d-9e0f1a2b3c4d'
    })).toBe('HCK-VIE-2026-0502-ABRANDSTETTE')
  })

  test('falls back to the application id when the participant name has no usable characters', () => {
    expect(buildEventCertificateId({
      eventType: 'meetup',
      city: '',
      eventDateIso: '2026-06-01T17:30:00.000Z',
      participantName: '王伟',
      applicationId: '1a2b3c4d-5e6f-4a1b-8c2d-9e0f1a2b3c4d'
    })).toBe('MTP-EVT-2026-0601-1A2B3C')
  })

  test('builds the public certificate path', () => {
    expect(buildEventCertificatePath('codex-build-vienna', 'user_1')).toBe('/events/codex-build-vienna/user_1')
  })

  test('summarizes participation with track, placement, and prizes', () => {
    const base = {
      participantName: 'Maria Novák',
      eventName: 'Codex Community Build - Vienna',
      eventDateLabel: 'June 20, 2026',
      placement: null,
      prizes: [] as string[]
    }

    expect(buildEventCertificateSummary({ ...base, trackName: null }))
      .toBe('Maria Novák has participated in Codex Community Build - Vienna on June 20, 2026.')
    expect(buildEventCertificateSummary({ ...base, trackName: 'Agents & Automation' }))
      .toBe('Maria Novák has participated in Codex Community Build - Vienna on June 20, 2026. Track: Agents & Automation.')
    expect(buildEventCertificateSummary({ ...base, trackName: 'Agents & Automation', placement: 1, prizes: ['OpenAI API Credits'] }))
      .toBe('Maria Novák has participated in Codex Community Build - Vienna on June 20, 2026. Finished 1st Place and won OpenAI API Credits. Track: Agents & Automation.')
  })

  test('formats placements with ordinal suffixes and trophy tiers', () => {
    expect(formatEventCertificatePlacement(1)).toBe('1st Place')
    expect(formatEventCertificatePlacement(2)).toBe('2nd Place')
    expect(formatEventCertificatePlacement(3)).toBe('3rd Place')
    expect(formatEventCertificatePlacement(4)).toBe('4th Place')
    expect(formatEventCertificatePlacement(11)).toBe('11th Place')
    expect(formatEventCertificatePlacement(22)).toBe('22nd Place')

    expect(resolveEventCertificatePlacementTier(1)).toBe('gold')
    expect(resolveEventCertificatePlacementTier(2)).toBe('silver')
    expect(resolveEventCertificatePlacementTier(3)).toBe('bronze')
    expect(resolveEventCertificatePlacementTier(4)).toBeNull()
  })
})
