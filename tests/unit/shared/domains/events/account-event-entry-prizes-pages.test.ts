import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

import {
  accountEventEntryPagePath,
  accountEventEntryPageSchema
} from '../../../../../shared/domains/events/account-event-entry-page'
import {
  accountEventPrizesPagePath,
  accountEventPrizesPageSchema
} from '../../../../../shared/domains/events/account-event-prizes-page'
import { accountEventPageRoutePaths } from '../../../../../server/domains/events/account-event-page-contract'

const entryPageSource = readFileSync(
  new URL('../../../../../app/pages/account/events/[slug]/index.vue', import.meta.url),
  'utf8'
)
const creditsPanelSource = readFileSync(
  new URL('../../../../../app/components/account/events/AccountEventCreditsPanel.vue', import.meta.url),
  'utf8'
)
const talkPanelSource = readFileSync(
  new URL('../../../../../app/components/account/events/AccountEventTalkProposalPanel.vue', import.meta.url),
  'utf8'
)
const talkReviewPanelSource = readFileSync(
  new URL('../../../../../app/components/account/events/AccountEventTalkProposalReviewPanel.vue', import.meta.url),
  'utf8'
)

describe('account-event entry and prizes contracts', () => {
  test('exposes concrete page-shaped schemas and canonical routes', () => {
    expect(accountEventEntryPagePath).toBe('/api/account/events/:slug/entry')
    expect(accountEventPrizesPagePath).toBe('/api/account/events/:slug/prizes')
    expect(accountEventPageRoutePaths.entry).toBe(accountEventEntryPagePath)
    expect(accountEventPageRoutePaths.prizes).toBe(accountEventPrizesPagePath)
    expect(Object.keys(accountEventEntryPageSchema.shape)).toEqual([
      'event',
      'adminSettingsEvent',
      'access',
      'participation',
      'participantCredits',
      'adminCredits',
      'talkProposal',
      'talkProposalReviews',
      'talkProposalReviewTotal',
      'participantRank',
      'tabVisibility',
      'applicationStatus',
      'lumaSyncStatus'
    ])
    expect(Object.keys(accountEventPrizesPageSchema.shape)).toEqual([
      'event',
      'adminSettingsEvent',
      'prizes',
      'winners',
      'publishedProjects',
      'participantRank',
      'participantOutcome'
    ])
    expect(accountEventEntryPageSchema.shape).not.toHaveProperty('include')
    expect(accountEventEntryPageSchema.shape).not.toHaveProperty('resourceMap')
    expect(accountEventPrizesPageSchema.shape).not.toHaveProperty('include')
    expect(accountEventPrizesPageSchema.shape).not.toHaveProperty('resourceMap')
  })

  test('uses the shared page request and removes the old entry/prizes fan-out callers', () => {
    expect(entryPageSource).toContain('useAccountEventPageRequest<AccountEventEntryPage>(slug, \'entry\', {')
    expect(entryPageSource).toContain('useAccountEventPageRequest<AccountEventPrizesPage>(slug, \'prizes\'')
    expect(entryPageSource).toContain('immediate: false')
    expect(entryPageSource).toContain('prizesPageRequest.abort()')
    expect(entryPageSource).not.toContain('/api/events/slug/')
    expect(entryPageSource).not.toContain('/api/account/events\'')
    expect(entryPageSource).not.toContain('/api/events/participation')
    expect(entryPageSource).not.toContain('/api/events/${workspaceEventId.value}/winners')
    expect(entryPageSource).not.toContain('/api/events/${workspaceEventId.value}/published-projects')
    expect(entryPageSource).not.toContain('/api/events/${workspaceEventId.value}/rank/me')
    expect(entryPageSource).not.toContain('/api/events/${initialEvent.id}/talk-proposals/me')
  })

  test('keeps credits and talk panels as prop/event consumers', () => {
    for (const source of [creditsPanelSource, talkPanelSource, talkReviewPanelSource]) {
      expect(source).not.toContain('useApiData')
      expect(source).not.toContain('useAbortableRequest')
    }
    expect(talkPanelSource).not.toContain('onMounted')
    expect(talkReviewPanelSource).not.toContain('onMounted')
    expect(creditsPanelSource).toContain('participantCredits: AccountEventEntryParticipantCreditOffer[]')
    expect(creditsPanelSource).toContain('adminCredits: AccountEventEntryAdminCreditOffer[]')
    expect(talkPanelSource).toContain('proposal: AccountEventEntryTalkProposal | null')
    expect(talkReviewPanelSource).toContain('entries: AccountEventEntryTalkProposalReview[]')
  })
})
