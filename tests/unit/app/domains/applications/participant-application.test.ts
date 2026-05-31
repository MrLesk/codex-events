import { describe, expect, test } from 'vitest'
import { nextTick, reactive, ref, watch } from 'vue'

import {
  areParticipantTeamMemberHintsEqual,
  createParticipantTeamMemberHintRows,
  formatParticipantApplicationStatus,
  getParticipantApplicationWithdrawalAvailability,
  getEventApplicationAvailabilityMessage,
  getParticipantApplicationSubmissionPolicy,
  getParticipantApplicationStatusColor,
  isProofOfExecutionLinksValid,
  isParticipantApplicationSubmittedNotice,
  listEventProfileFields,
  listMissingRequiredProfileFields,
  listRequiredProfileFields,
  normalizeProofOfExecutionLinks,
  normalizeParticipantTeamMemberHintsForSubmission,
  parseProofOfExecutionLinks,
  parseParticipantRegistrationDetailsJson,
  resolvePublicEventPrimaryAction,
  resolveParticipantApplicationSubmittedTransition,
  resolveParticipantRegistrationEntry,
  shouldShowParticipantOverviewStatusBanner,
  shouldShowPublicRegistrationEntry,
  summarizeParticipantApplicationStatus
} from '../../../../../app/domains/applications/participant-application'
import { cloneFormValues } from '../../../../../app/utils/form-values'

function createProfileFieldConfig(overrides = {}) {
  return {
    applicationXProfileVisible: true,
    applicationLinkedinProfileVisible: true,
    applicationGithubProfileVisible: true,
    applicationChatgptEmailVisible: true,
    applicationOpenaiOrgIdVisible: true,
    applicationLumaEmailVisible: true,
    requireXProfile: false,
    requireLinkedinProfile: false,
    requireGithubProfile: false,
    requireChatgptEmail: false,
    requireOpenaiOrgId: false,
    requireLumaEmail: false,
    ...overrides
  }
}

describe('participant application helpers', () => {
  test('lists only the required profile fields missing from the platform account', () => {
    expect(listMissingRequiredProfileFields(createProfileFieldConfig({
      requireXProfile: true,
      requireLinkedinProfile: true,
      requireGithubProfile: true,
      requireChatgptEmail: true,
      requireOpenaiOrgId: true,
      requireLumaEmail: true
    }), {
      xProfileUrl: null,
      linkedinProfileUrl: 'https://linkedin.com/in/member',
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaEmail: null
    })).toEqual([
      {
        key: 'xProfileUrl',
        label: 'X profile URL'
      },
      {
        key: 'githubProfileUrl',
        label: 'GitHub profile URL'
      },
      {
        key: 'chatgptEmail',
        label: 'ChatGPT email'
      },
      {
        key: 'openaiOrgId',
        label: 'OpenAI org ID'
      },
      {
        key: 'lumaEmail',
        label: 'Luma email'
      }
    ])
  })

  test('lists required profile fields for an event', () => {
    expect(listRequiredProfileFields(createProfileFieldConfig({
      requireXProfile: true,
      requireLinkedinProfile: false,
      requireGithubProfile: true,
      requireChatgptEmail: false,
      requireOpenaiOrgId: true,
      requireLumaEmail: false
    }))).toEqual([
      { key: 'xProfileUrl', label: 'X profile URL' },
      { key: 'githubProfileUrl', label: 'GitHub profile URL' },
      { key: 'openaiOrgId', label: 'OpenAI org ID' }
    ])
  })

  test('lists all event profile fields with required flags', () => {
    expect(listEventProfileFields(createProfileFieldConfig({
      requireXProfile: true,
      requireLinkedinProfile: false,
      requireGithubProfile: true,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaEmail: true
    }))).toEqual([
      { key: 'xProfileUrl', label: 'X profile URL', required: true, visible: true },
      { key: 'linkedinProfileUrl', label: 'LinkedIn profile URL', required: false, visible: true },
      { key: 'githubProfileUrl', label: 'GitHub profile URL', required: true, visible: true },
      { key: 'chatgptEmail', label: 'ChatGPT email', required: false, visible: true },
      { key: 'openaiOrgId', label: 'OpenAI org ID', required: false, visible: true },
      { key: 'lumaEmail', label: 'Luma email', required: true, visible: true }
    ])
  })

  test('shows and requires luma email whenever the event requires it', () => {
    expect(listRequiredProfileFields(createProfileFieldConfig({
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaEmail: true
    }))).toEqual([
      {
        key: 'lumaEmail',
        label: 'Luma email'
      }
    ])

    expect(listEventProfileFields(createProfileFieldConfig({
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaEmail: true
    })).find(field => field.key === 'lumaEmail')).toEqual({
      key: 'lumaEmail',
      label: 'Luma email',
      required: true,
      visible: true
    })
  })

  test('does not require hidden profile fields', () => {
    expect(listRequiredProfileFields(createProfileFieldConfig({
      applicationGithubProfileVisible: false,
      requireGithubProfile: true
    }))).toEqual([])

    expect(listEventProfileFields(createProfileFieldConfig({
      applicationGithubProfileVisible: false,
      requireGithubProfile: true
    })).find(field => field.key === 'githubProfileUrl')).toEqual({
      key: 'githubProfileUrl',
      label: 'GitHub profile URL',
      required: false,
      visible: false
    })
  })

  test('compares team member hint arrays by value', () => {
    expect(areParticipantTeamMemberHintsEqual([
      { fullName: 'Ada Lovelace', email: 'ada@example.com' },
      { fullName: '', email: '' }
    ], [
      { fullName: 'Ada Lovelace', email: 'ada@example.com' },
      { fullName: '', email: '' }
    ])).toBe(true)

    expect(areParticipantTeamMemberHintsEqual([
      { fullName: 'Ada Lovelace', email: 'ada@example.com' }
    ], [
      { fullName: 'Ada Lovelace', email: 'ada@openai.com' }
    ])).toBe(false)
  })

  test('syncing checkbox changes does not recurse when team member hints are unchanged', async () => {
    const termsAccepted = ref(false)
    const inPersonAttendanceCommitment = ref(false)
    const whyThisEvent = ref('')
    const proofOfExecutionUrl = ref('')
    const teamIntent = ref<'solo' | 'team' | 'unknown'>('unknown')
    const teamMemberHints = ref(createParticipantTeamMemberHintRows(2))
    const profileForm = ref({
      firstName: '',
      familyName: '',
      xProfileUrl: '',
      linkedinProfileUrl: '',
      githubProfileUrl: '',
      chatgptEmail: '',
      openaiOrgId: '',
      lumaEmail: ''
    })
    const syncingFromModels = ref(false)
    const values = reactive({
      termsAccepted: termsAccepted.value,
      inPersonAttendanceCommitment: inPersonAttendanceCommitment.value,
      whyThisEvent: whyThisEvent.value,
      proofOfExecutionUrl: proofOfExecutionUrl.value,
      teamIntent: teamIntent.value,
      teamMemberHints: cloneFormValues(teamMemberHints.value),
      profileForm: cloneFormValues(profileForm.value)
    })

    let modelToFormSyncCount = 0
    let formToModelSyncCount = 0

    const syncValuesFromModels = () => {
      Object.assign(values, {
        termsAccepted: termsAccepted.value,
        inPersonAttendanceCommitment: inPersonAttendanceCommitment.value,
        whyThisEvent: whyThisEvent.value,
        proofOfExecutionUrl: proofOfExecutionUrl.value,
        teamIntent: teamIntent.value,
        teamMemberHints: cloneFormValues(teamMemberHints.value),
        profileForm: cloneFormValues(profileForm.value)
      })
    }

    watch([
      termsAccepted,
      inPersonAttendanceCommitment,
      whyThisEvent,
      proofOfExecutionUrl,
      teamIntent,
      teamMemberHints,
      profileForm
    ], () => {
      modelToFormSyncCount += 1
      syncingFromModels.value = true
      syncValuesFromModels()
      syncingFromModels.value = false
    }, {
      deep: true,
      immediate: true
    })

    watch(values, (nextValues) => {
      if (syncingFromModels.value) {
        return
      }

      formToModelSyncCount += 1
      termsAccepted.value = nextValues.termsAccepted ?? false
      inPersonAttendanceCommitment.value = nextValues.inPersonAttendanceCommitment ?? false
      whyThisEvent.value = nextValues.whyThisEvent ?? ''
      proofOfExecutionUrl.value = nextValues.proofOfExecutionUrl ?? ''
      teamIntent.value = nextValues.teamIntent ?? 'unknown'

      const nextTeamMemberHints = cloneFormValues(nextValues.teamMemberHints ?? [])

      if (!areParticipantTeamMemberHintsEqual(teamMemberHints.value, nextTeamMemberHints)) {
        teamMemberHints.value = nextTeamMemberHints
      }

      if (nextValues.profileForm) {
        Object.assign(profileForm.value, cloneFormValues(nextValues.profileForm))
      }
    }, {
      deep: true
    })

    termsAccepted.value = true
    await nextTick()
    await nextTick()

    expect(termsAccepted.value).toBe(true)
    expect(values.termsAccepted).toBe(true)
    expect(formToModelSyncCount).toBe(1)
    expect(modelToFormSyncCount).toBe(2)
  })

  test('formats participant application statuses and summaries for reviewed states', () => {
    expect(formatParticipantApplicationStatus('submitted')).toBe('Submitted')
    expect(formatParticipantApplicationStatus('approved')).toBe('Approved')
    expect(formatParticipantApplicationStatus('rejected')).toBe('Rejected')
    expect(formatParticipantApplicationStatus('withdrawn')).toBe('Withdrawn')

    expect(getParticipantApplicationStatusColor('submitted')).toBe('warning')
    expect(getParticipantApplicationStatusColor('approved')).toBe('success')
    expect(getParticipantApplicationStatusColor('rejected')).toBe('error')
    expect(getParticipantApplicationStatusColor('withdrawn')).toBe('neutral')

    expect(summarizeParticipantApplicationStatus('submitted', 'registration_open')).toContain('under review')
    expect(summarizeParticipantApplicationStatus('submitted', 'registration_open')).toContain('after approval')
    expect(summarizeParticipantApplicationStatus('approved', 'registration_open')).toContain('approved to create a team')
    expect(summarizeParticipantApplicationStatus('rejected', 'registration_open')).toContain('cannot submit another application')
    expect(summarizeParticipantApplicationStatus('withdrawn', 'registration_open')).toContain('withdrew from this event')
  })

  test('shows the overview status banner until approval transitions into submission work', () => {
    expect(shouldShowParticipantOverviewStatusBanner('submitted', 'registration_open')).toBe(true)
    expect(shouldShowParticipantOverviewStatusBanner('rejected', 'completed')).toBe(true)
    expect(shouldShowParticipantOverviewStatusBanner('approved', 'registration_open')).toBe(true)
    expect(shouldShowParticipantOverviewStatusBanner('approved', 'submission_open')).toBe(false)
    expect(shouldShowParticipantOverviewStatusBanner(null, 'registration_open')).toBe(false)
  })

  test('computes participant application withdrawal availability from status and team membership', () => {
    expect(getParticipantApplicationWithdrawalAvailability({
      applicationStatus: 'submitted',
      hasActiveTeamMembership: false
    })).toEqual({
      isAllowed: true
    })

    expect(getParticipantApplicationWithdrawalAvailability({
      applicationStatus: 'approved',
      hasActiveTeamMembership: true
    })).toEqual({
      isAllowed: false,
      reason: 'Leave your active team before withdrawing from this event.'
    })

    expect(getParticipantApplicationWithdrawalAvailability({
      applicationStatus: 'withdrawn',
      hasActiveTeamMembership: false
    })).toEqual({
      isAllowed: false,
      reason: 'This application is already withdrawn.'
    })
  })

  test('describes whether the event currently allows new applications', () => {
    expect(getEventApplicationAvailabilityMessage(
      'registration_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-21T12:00:00.000Z')
    )).toBe('Applications are open for this event.')
    expect(getEventApplicationAvailabilityMessage(
      'draft',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-19T12:00:00.000Z')
    )).toBe('Applications are not available until registration opens.')
    expect(getEventApplicationAvailabilityMessage(
      'registration_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-23T12:00:00.000Z')
    )).toBe('Applications are closed for this event.')
  })

  test('shows the public registration entry only while registration is open', () => {
    expect(shouldShowPublicRegistrationEntry(
      'registration_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-21T12:00:00.000Z')
    )).toBe(true)
    expect(shouldShowPublicRegistrationEntry(
      'registration_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-23T12:00:00.000Z')
    )).toBe(false)
    expect(shouldShowPublicRegistrationEntry(
      'submission_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-21T12:00:00.000Z')
    )).toBe(false)
  })

  test('resolves participant registration entry redirects by actor and state', () => {
    expect(resolveParticipantRegistrationEntry({
      actorKind: 'anonymous',
      hasAcceptedCurrentPlatformDocuments: false,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/auth/login?returnTo=%2Faccount%2Fregister%3FreturnTo%3D%252Fevents%252Fcodex-spring%252Fregister',
      external: true
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'authenticated_identity',
      hasAcceptedCurrentPlatformDocuments: false,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/account/register?returnTo=%2Fevents%2Fcodex-spring%2Fregister',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'blind_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/events/codex-spring',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: true,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/account/events/codex-spring',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toBeNull()

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/account/register?returnTo=%2Fevents%2Fcodex-spring%2Fregister',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-23T12:00:00.000Z')
    })).toEqual({
      to: '/events/codex-spring',
      external: false
    })
  })

  test('resolves the application-submitted transition into the account workspace', () => {
    expect(resolveParticipantApplicationSubmittedTransition('codex-spring')).toEqual({
      title: 'Application submitted',
      description: 'Opening your event workspace so you can track your application status. This can take a moment.',
      eyebrow: 'Application received',
      to: {
        path: '/account/events/codex-spring',
        query: {
          notice: 'application_submitted'
        }
      }
    })
  })

  test('resolves the auto-approved application transition into the account workspace', () => {
    expect(resolveParticipantApplicationSubmittedTransition('codex-spring', {
      autoApproveApplications: true
    })).toEqual({
      title: 'Application approved',
      description: 'Opening your event workspace so you can start team setup. This can take a moment.',
      eyebrow: 'Application approved',
      to: {
        path: '/account/events/codex-spring',
        query: {
          notice: 'application_submitted'
        }
      }
    })
  })

  test('recognizes the one-time application-submitted notice query', () => {
    expect(isParticipantApplicationSubmittedNotice('application_submitted')).toBe(true)
    expect(isParticipantApplicationSubmittedNotice([' application_submitted '])).toBe(true)
    expect(isParticipantApplicationSubmittedNotice('different_notice')).toBe(false)
    expect(isParticipantApplicationSubmittedNotice(undefined)).toBe(false)
  })

  test('keeps the public detail CTA as Register while registration is open', () => {
    expect(resolvePublicEventPrimaryAction({
      actorKind: 'anonymous',
      hasAcceptedCurrentPlatformDocuments: false,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasEventWorkspaceAccess: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      label: 'Register',
      to: '/auth/login?returnTo=%2Faccount%2Fregister%3FreturnTo%3D%252Fevents%252Fcodex-spring%252Fregister',
      external: true
    })

    expect(resolvePublicEventPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasEventWorkspaceAccess: true,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      label: 'Register',
      to: '/events/codex-spring/register',
      external: false
    })

    expect(resolvePublicEventPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      eventSlug: 'codex-spring',
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasEventWorkspaceAccess: true,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      label: 'Register',
      to: '/account/register?returnTo=%2Fevents%2Fcodex-spring%2Fregister',
      external: false
    })
  })

  test('shows the public detail Open workspace CTA after registration closes when account access exists', () => {
    expect(resolvePublicEventPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'blind_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasEventWorkspaceAccess: true,
      now: new Date('2026-03-24T12:00:00.000Z')
    })).toEqual({
      label: 'Open workspace',
      to: '/account/events/codex-spring',
      external: false
    })

    expect(resolvePublicEventPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      eventSlug: 'codex-spring',
      eventState: 'blind_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasEventWorkspaceAccess: false,
      now: new Date('2026-03-24T12:00:00.000Z')
    })).toBeNull()

    expect(resolvePublicEventPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      eventSlug: 'codex-spring',
      eventState: 'blind_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasEventWorkspaceAccess: true,
      now: new Date('2026-03-24T12:00:00.000Z')
    })).toEqual({
      label: 'Open workspace',
      to: '/account/register?returnTo=%2Faccount%2Fevents%2Fcodex-spring',
      external: false
    })
  })

  test('returns registration submission policy based on lifecycle, profile, and terms acceptance', () => {
    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-21T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: false,
      hasAcceptedCurrentTerms: false,
      requiresInPersonAttendanceCommitment: false,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: true
    })

    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-21T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true,
      requiresInPersonAttendanceCommitment: false,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: true
    })

    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'submission_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-21T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true,
      requiresInPersonAttendanceCommitment: false,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: false,
      reason: 'Applications are closed for this event.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-23T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true,
      requiresInPersonAttendanceCommitment: false,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: false,
      reason: 'Applications are closed for this event.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-21T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 2,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true,
      requiresInPersonAttendanceCommitment: false,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: false,
      reason: 'Complete the required profile fields before submitting this application.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-21T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: false,
      requiresInPersonAttendanceCommitment: false,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: false,
      reason: 'Accept the current application terms before submitting.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      eventState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      now: new Date('2026-03-21T12:00:00.000Z'),
      applicationStatus: null,
      missingRequiredProfileFieldCount: 0,
      hasCurrentApplicationTerms: true,
      hasAcceptedCurrentTerms: true,
      requiresInPersonAttendanceCommitment: true,
      hasAcceptedInPersonAttendanceCommitment: false
    })).toEqual({
      isAllowed: false,
      reason: 'Confirm in-person attendance commitment before submitting this application.'
    })
  })

  test('creates and normalizes team-member hint rows for submission payloads', () => {
    expect(createParticipantTeamMemberHintRows(3)).toEqual([
      { fullName: '', email: '' },
      { fullName: '', email: '' }
    ])

    expect(normalizeParticipantTeamMemberHintsForSubmission([
      { fullName: ' Ada Lovelace ', email: 'ada@example.com' },
      { fullName: '', email: '  ' },
      { fullName: 'Grace Hopper', email: '' }
    ], 2)).toEqual([
      { fullName: 'Ada Lovelace', email: 'ada@example.com' }
    ])
  })

  test('parses and validates comma-separated proof-of-execution links', () => {
    expect(parseProofOfExecutionLinks(' https://github.com/example/project , https://demo.example.com/app ')).toEqual([
      'https://github.com/example/project',
      'https://demo.example.com/app'
    ])

    expect(normalizeProofOfExecutionLinks(' https://github.com/example/project , , https://demo.example.com/app ')).toBe(
      'https://github.com/example/project, https://demo.example.com/app'
    )

    expect(isProofOfExecutionLinksValid('https://github.com/example/project, https://demo.example.com/app')).toBe(true)
    expect(isProofOfExecutionLinksValid('https://github.com/example/project, ftp://example.com/file')).toBe(false)
  })

  test('parses persisted registration details JSON with fallback behavior', () => {
    expect(parseParticipantRegistrationDetailsJson(JSON.stringify({
      teamIntent: 'team',
      teamMembers: [
        {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com'
        }
      ],
      whyThisEvent: 'I want to build something useful.',
      proofOfExecutionUrl: 'https://github.com/example/project'
    }))).toEqual({
      teamIntent: 'team',
      teamMembers: [
        {
          fullName: 'Ada Lovelace',
          email: 'ada@example.com'
        }
      ],
      inPersonAttendanceCommitment: false,
      whyThisEvent: 'I want to build something useful.',
      proofOfExecutionUrl: 'https://github.com/example/project'
    })

    expect(parseParticipantRegistrationDetailsJson('{invalid-json')).toEqual({
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisEvent: '',
      proofOfExecutionUrl: ''
    })
  })
})
