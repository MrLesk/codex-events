import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const routeSource = readFileSync(new URL('../../../../app/pages/events/[slug]/register.vue', import.meta.url), 'utf8')
const templateSource = readFileSync(new URL('../../../../app/components/applications/participant-registration/templates/ParticipantRegistrationFormTemplate.vue', import.meta.url), 'utf8')
const composableSource = readFileSync(new URL('../../../../app/composables/useParticipantRegistrationForm.ts', import.meta.url), 'utf8')
const proposalSource = readFileSync(new URL('../../../../app/components/talk-proposals/organisms/TalkProposalRegistrationSection.vue', import.meta.url), 'utf8')
const progressRailSource = readFileSync(new URL('../../../../app/components/applications/participant-registration/organisms/ParticipantRegistrationProgressRail.vue', import.meta.url), 'utf8')

describe('participant registration atomic component contract', () => {
  test('routes directly to the atomic template without the deleted monolith', () => {
    expect(routeSource).toContain('ParticipantRegistrationFormTemplate')
    expect(routeSource).not.toContain('ParticipantApplicationRegistrationPanel')
    expect(templateSource).toContain('ParticipantRegistrationProfileSection')
    expect(templateSource).toContain('ParticipantRegistrationApplicationSection')
    expect(templateSource).toContain('ParticipantRegistrationParticipationSection')
    expect(templateSource).toContain('ParticipantRegistrationCommitmentsSection')
  })

  test('keeps form authority and navigation in the composable', () => {
    expect(templateSource).toContain('useParticipantRegistrationForm')
    expect(composableSource).toContain('getParticipantRegistrationValidationErrors')
    expect(composableSource).toContain('validateSubmitAttempt')
    expect(composableSource).toContain('focusFirstInvalid')
    expect(composableSource).toContain('navigateToSection')
    expect(composableSource).toContain('prefers-reduced-motion: reduce')
  })

  test('renders desktop rail and equivalent mobile progress and submit access', () => {
    expect(progressRailSource).toContain('registration-progress-rail')
    expect(templateSource).toContain('registration-mobile-progress')
    expect(templateSource).toContain('lg:hidden')
    expect(templateSource).toContain('fixed inset-x-0 bottom-0')
  })

  test('keeps one combined CFP action and focus targets for every CFP field', () => {
    expect(routeSource.match(/Register and submit proposal/g)).toHaveLength(1)
    expect(proposalSource).toContain('talkProposal.title')
    expect(proposalSource).toContain('talkProposal.abstract')
    expect(proposalSource).toContain('talkProposal.demoOrSlidesUrl')
    expect(proposalSource).toContain('registration-field-prefix="talkProposal.question"')
  })
})
