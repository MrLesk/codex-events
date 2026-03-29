import { describe, expect, test } from 'vitest'
import { nextTick, reactive, ref, watch } from 'vue'

import {
  areParticipantTeamMemberHintsEqual,
  createParticipantTeamMemberHintRows,
  formatParticipantApplicationStatus,
  getHackathonApplicationAvailabilityMessage,
  getParticipantApplicationSubmissionPolicy,
  getParticipantApplicationStatusColor,
  isProofOfExecutionLinksValid,
  isParticipantProfileUrlValid,
  isParticipantSocialProfileUrlValid,
  isOpenAiOrgIdFormatValid,
  listHackathonProfileFields,
  listMissingRequiredProfileFields,
  listRequiredProfileFields,
  normalizeProofOfExecutionLinks,
  normalizeParticipantProfileUrl,
  normalizeParticipantTeamMemberHintsForSubmission,
  parseProofOfExecutionLinks,
  parseParticipantRegistrationDetailsJson,
  resolvePublicHackathonPrimaryAction,
  resolveParticipantRegistrationEntry,
  shouldShowPublicRegistrationEntry,
  summarizeParticipantApplicationStatus
} from '../../../../app/utils/participant-application'
import { cloneFormValues } from '../../../../app/utils/form-values'

describe('participant application helpers', () => {
  test('lists only the required profile fields missing from the platform account', () => {
    expect(listMissingRequiredProfileFields({
      requireXProfile: true,
      requireLinkedinProfile: true,
      requireGithubProfile: true,
      requireChatgptEmail: true,
      requireOpenaiOrgId: true,
      requireLumaProfile: true,
      lumaEventUrl: 'https://luma.com/codex'
    }, {
      xProfileUrl: null,
      linkedinProfileUrl: 'https://linkedin.com/in/member',
      githubProfileUrl: null,
      chatgptEmail: null,
      openaiOrgId: null,
      lumaUsername: null
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
        key: 'lumaUsername',
        label: 'Luma username'
      }
    ])
  })

  test('lists required profile fields for a hackathon', () => {
    expect(listRequiredProfileFields({
      requireXProfile: true,
      requireLinkedinProfile: false,
      requireGithubProfile: true,
      requireChatgptEmail: false,
      requireOpenaiOrgId: true,
      requireLumaProfile: false,
      lumaEventUrl: null
    })).toEqual([
      { key: 'xProfileUrl', label: 'X profile URL' },
      { key: 'githubProfileUrl', label: 'GitHub profile URL' },
      { key: 'openaiOrgId', label: 'OpenAI org ID' }
    ])
  })

  test('lists all hackathon profile fields with required flags', () => {
    expect(listHackathonProfileFields({
      requireXProfile: true,
      requireLinkedinProfile: false,
      requireGithubProfile: true,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaProfile: true,
      lumaEventUrl: 'https://luma.com/codex'
    })).toEqual([
      { key: 'xProfileUrl', label: 'X profile URL', required: true, visible: true },
      { key: 'linkedinProfileUrl', label: 'LinkedIn profile URL', required: false, visible: true },
      { key: 'githubProfileUrl', label: 'GitHub profile URL', required: true, visible: true },
      { key: 'chatgptEmail', label: 'ChatGPT email', required: false, visible: false },
      { key: 'openaiOrgId', label: 'OpenAI org ID', required: false, visible: false },
      { key: 'lumaUsername', label: 'Luma username', required: true, visible: true }
    ])
  })

  test('does not require or show luma username when no luma event URL is configured', () => {
    expect(listRequiredProfileFields({
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaProfile: true,
      lumaEventUrl: null
    })).toEqual([])

    expect(listHackathonProfileFields({
      requireXProfile: false,
      requireLinkedinProfile: false,
      requireGithubProfile: false,
      requireChatgptEmail: false,
      requireOpenaiOrgId: false,
      requireLumaProfile: true,
      lumaEventUrl: null
    }).find(field => field.key === 'lumaUsername')).toEqual({
      key: 'lumaUsername',
      label: 'Luma username',
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
    const whyThisHackathon = ref('')
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
      lumaUsername: ''
    })
    const syncingFromModels = ref(false)
    const values = reactive({
      termsAccepted: termsAccepted.value,
      inPersonAttendanceCommitment: inPersonAttendanceCommitment.value,
      whyThisHackathon: whyThisHackathon.value,
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
        whyThisHackathon: whyThisHackathon.value,
        proofOfExecutionUrl: proofOfExecutionUrl.value,
        teamIntent: teamIntent.value,
        teamMemberHints: cloneFormValues(teamMemberHints.value),
        profileForm: cloneFormValues(profileForm.value)
      })
    }

    watch([
      termsAccepted,
      inPersonAttendanceCommitment,
      whyThisHackathon,
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
      whyThisHackathon.value = nextValues.whyThisHackathon ?? ''
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

    expect(getParticipantApplicationStatusColor('submitted')).toBe('warning')
    expect(getParticipantApplicationStatusColor('approved')).toBe('success')
    expect(getParticipantApplicationStatusColor('rejected')).toBe('error')

    expect(summarizeParticipantApplicationStatus('submitted', 'registration_open')).toContain('under review')
    expect(summarizeParticipantApplicationStatus('submitted', 'registration_open')).toContain('after approval')
    expect(summarizeParticipantApplicationStatus('approved', 'registration_open')).toContain('approved to create a team')
    expect(summarizeParticipantApplicationStatus('rejected', 'registration_open')).toContain('cannot submit another application')
  })

  test('describes whether the hackathon currently allows new applications', () => {
    expect(getHackathonApplicationAvailabilityMessage(
      'registration_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-21T12:00:00.000Z')
    )).toBe('Applications are open for this hackathon.')
    expect(getHackathonApplicationAvailabilityMessage(
      'draft',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-19T12:00:00.000Z')
    )).toBe('Applications are not available until registration opens.')
    expect(getHackathonApplicationAvailabilityMessage(
      'registration_open',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      new Date('2026-03-23T12:00:00.000Z')
    )).toBe('Applications are closed for this hackathon.')
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
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/auth/login?returnTo=%2Faccount%2Fregister%3FreturnTo%3D%252Fhackathons%252Fcodex-spring%252Fregister',
      external: true
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'authenticated_identity',
      hasAcceptedCurrentPlatformDocuments: false,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/account/register?returnTo=%2Fhackathons%2Fcodex-spring%2Fregister',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'judge_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/hackathons/codex-spring',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: true,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/account/hackathons/codex-spring',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toBeNull()

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      to: '/account/register?returnTo=%2Fhackathons%2Fcodex-spring%2Fregister',
      external: false
    })

    expect(resolveParticipantRegistrationEntry({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasExistingApplication: false,
      now: new Date('2026-03-23T12:00:00.000Z')
    })).toEqual({
      to: '/hackathons/codex-spring',
      external: false
    })
  })

  test('keeps the public detail CTA as Register while registration is open', () => {
    expect(resolvePublicHackathonPrimaryAction({
      actorKind: 'anonymous',
      hasAcceptedCurrentPlatformDocuments: false,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasHackathonWorkspaceAccess: false,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      label: 'Register',
      to: '/auth/login?returnTo=%2Faccount%2Fregister%3FreturnTo%3D%252Fhackathons%252Fcodex-spring%252Fregister',
      external: true
    })

    expect(resolvePublicHackathonPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasHackathonWorkspaceAccess: true,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      label: 'Register',
      to: '/hackathons/codex-spring/register',
      external: false
    })

    expect(resolvePublicHackathonPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      hackathonSlug: 'codex-spring',
      hackathonState: 'registration_open',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasHackathonWorkspaceAccess: true,
      now: new Date('2026-03-21T12:00:00.000Z')
    })).toEqual({
      label: 'Register',
      to: '/account/register?returnTo=%2Fhackathons%2Fcodex-spring%2Fregister',
      external: false
    })
  })

  test('shows the public detail Open workspace CTA after registration closes when account access exists', () => {
    expect(resolvePublicHackathonPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'judge_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasHackathonWorkspaceAccess: true,
      now: new Date('2026-03-24T12:00:00.000Z')
    })).toEqual({
      label: 'Open workspace',
      to: '/account/hackathons/codex-spring',
      external: false
    })

    expect(resolvePublicHackathonPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: true,
      hackathonSlug: 'codex-spring',
      hackathonState: 'judge_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasHackathonWorkspaceAccess: false,
      now: new Date('2026-03-24T12:00:00.000Z')
    })).toBeNull()

    expect(resolvePublicHackathonPrimaryAction({
      actorKind: 'platform_user',
      hasAcceptedCurrentPlatformDocuments: false,
      hackathonSlug: 'codex-spring',
      hackathonState: 'judge_review',
      registrationOpensAt: '2026-03-20T12:00:00.000Z',
      registrationClosesAt: '2026-03-23T12:00:00.000Z',
      hasHackathonWorkspaceAccess: true,
      now: new Date('2026-03-24T12:00:00.000Z')
    })).toEqual({
      label: 'Open workspace',
      to: '/account/register?returnTo=%2Faccount%2Fhackathons%2Fcodex-spring',
      external: false
    })
  })

  test('returns registration submission policy based on lifecycle, profile, and terms acceptance', () => {
    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'registration_open',
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
      hackathonState: 'submission_open',
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
      reason: 'Applications are closed for this hackathon.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'registration_open',
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
      reason: 'Applications are closed for this hackathon.'
    })

    expect(getParticipantApplicationSubmissionPolicy({
      hackathonState: 'registration_open',
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
      hackathonState: 'registration_open',
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
      hackathonState: 'registration_open',
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

  test('validates OpenAI org ID format used by the registration form', () => {
    expect(isOpenAiOrgIdFormatValid('org_123abc')).toBe(true)
    expect(isOpenAiOrgIdFormatValid('org_regular_user')).toBe(true)
    expect(isOpenAiOrgIdFormatValid('org-123abc')).toBe(true)
    expect(isOpenAiOrgIdFormatValid('')).toBe(false)
  })

  test('normalizes participant profile URLs by prepending https when scheme is missing', () => {
    expect(normalizeParticipantProfileUrl('github.com/codex')).toBe('https://github.com/codex')
    expect(normalizeParticipantProfileUrl('https://x.com/codex')).toBe('https://x.com/codex')
    expect(normalizeParticipantProfileUrl('')).toBe('')
  })

  test('accepts schema-less profile URLs as valid registration input', () => {
    expect(isParticipantProfileUrlValid('github.com/codex')).toBe(true)
    expect(isParticipantProfileUrlValid('https://github.com/codex')).toBe(true)
    expect(isParticipantProfileUrlValid('nota url')).toBe(false)
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

  test('validates social profile URL domains by field', () => {
    expect(isParticipantSocialProfileUrlValid('githubProfileUrl', 'github.com/codex')).toBe(true)
    expect(isParticipantSocialProfileUrlValid('githubProfileUrl', 'github.cox/codex')).toBe(false)
    expect(isParticipantSocialProfileUrlValid('linkedinProfileUrl', 'linkedin.com/in/codex')).toBe(true)
    expect(isParticipantSocialProfileUrlValid('linkedinProfileUrl', 'example.com/in/codex')).toBe(false)
    expect(isParticipantSocialProfileUrlValid('xProfileUrl', 'x.com/codex')).toBe(true)
    expect(isParticipantSocialProfileUrlValid('xProfileUrl', 'twitter.com/codex')).toBe(true)
    expect(isParticipantSocialProfileUrlValid('xProfileUrl', 'social.example/codex')).toBe(false)
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
      whyThisHackathon: 'I want to build something useful.',
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
      whyThisHackathon: 'I want to build something useful.',
      proofOfExecutionUrl: 'https://github.com/example/project'
    })

    expect(parseParticipantRegistrationDetailsJson('{invalid-json')).toEqual({
      teamIntent: 'unknown',
      teamMembers: [],
      inPersonAttendanceCommitment: false,
      whyThisHackathon: '',
      proofOfExecutionUrl: ''
    })
  })
})
