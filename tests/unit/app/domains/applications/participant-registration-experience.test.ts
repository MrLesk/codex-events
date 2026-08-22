import { describe, expect, test } from 'vitest'

import type { ParticipantRegistrationConfiguration, ParticipantRegistrationFormState } from '../../../../../app/domains/applications/participant-registration-experience'

import {
  buildParticipantRegistrationExperience,
  getParticipantRegistrationValidationErrors
} from '../../../../../app/domains/applications/participant-registration-experience'

function createForm(overrides: Partial<ParticipantRegistrationFormState> = {}): ParticipantRegistrationFormState {
  return {
    termsAccepted: false,
    inPersonAttendanceCommitment: false,
    whyThisEvent: '',
    proofOfExecutionUrl: '',
    aiKnowledgeLevel: '',
    selectedTrackId: '',
    teamIntent: 'unknown',
    teamMemberHints: [],
    profileForm: {
      firstName: '',
      familyName: '',
      xProfileUrl: '',
      linkedinProfileUrl: '',
      githubProfileUrl: '',
      chatgptEmail: '',
      openaiOrgId: '',
      lumaEmail: ''
    },
    ...overrides
  }
}

function createConfiguration(overrides: Partial<ParticipantRegistrationConfiguration> = {}): ParticipantRegistrationConfiguration {
  return {
    event: {
      eventType: 'meetup',
      inPersonEvent: false,
      applicationWhyThisEventVisible: false,
      applicationProofOfExecutionVisible: false,
      applicationTeamIntentVisible: false,
      applicationAiKnowledgeVisible: false,
      requireWhyThisEvent: false,
      requireProofOfExecution: false,
      requireTeamIntent: false,
      requireAiKnowledge: false
    },
    profileFields: [],
    trackOptions: [],
    maxTeamMembers: 1,
    hasCurrentApplicationTerms: false,
    ...overrides
  }
}

describe('participant registration experience', () => {
  test('keeps the minimal Meetup progress model to required identity and confirmation', () => {
    const configuration = createConfiguration()
    const empty = createForm()
    const experience = buildParticipantRegistrationExperience({ configuration, form: empty })

    expect(experience.sections.map(section => section.id)).toEqual(['details', 'confirmation'])
    expect(experience).toMatchObject({ requiredCount: 2, completedRequiredCount: 0, readyToSubmit: false })

    const completed = buildParticipantRegistrationExperience({
      configuration,
      form: createForm({ profileForm: { ...empty.profileForm, firstName: 'Ada', familyName: 'Lovelace' } })
    })
    expect(completed).toMatchObject({ requiredCount: 2, completedRequiredCount: 2, readyToSubmit: true })
  })

  test('uses Build tracks in place of AI Knowledge and validates the configured track', () => {
    const configuration = createConfiguration({
      event: {
        ...createConfiguration().event,
        eventType: 'build',
        applicationAiKnowledgeVisible: true,
        requireAiKnowledge: true
      },
      trackOptions: [{ id: 'agents', name: 'Agents', shortDescription: '**Build agents.**', displayOrder: 0 }]
    })
    const form = createForm({
      aiKnowledgeLevel: 'advanced',
      selectedTrackId: 'missing',
      profileForm: { ...createForm().profileForm, firstName: 'Ada', familyName: 'Lovelace' }
    })
    const errors = getParticipantRegistrationValidationErrors(configuration, form)
    const experience = buildParticipantRegistrationExperience({ configuration, form, errors, showErrors: true })

    expect(errors.selectedTrackId).toBe('Choose a track.')
    expect(errors.aiKnowledgeLevel).toBeUndefined()
    expect(experience.sections.find(section => section.id === 'application')?.fields.map(field => field.id)).toEqual(['selectedTrackId'])
  })

  test('shows AI Knowledge for a Build without tracks and lets optional application fields stay complete', () => {
    const configuration = createConfiguration({
      event: {
        ...createConfiguration().event,
        eventType: 'build',
        applicationAiKnowledgeVisible: true,
        applicationWhyThisEventVisible: true,
        requireAiKnowledge: true,
        requireWhyThisEvent: false
      }
    })
    const form = createForm({
      aiKnowledgeLevel: 'intermediate',
      profileForm: { ...createForm().profileForm, firstName: 'Ada', familyName: 'Lovelace' }
    })
    const experience = buildParticipantRegistrationExperience({ configuration, form })

    expect(experience.sections.find(section => section.id === 'application')?.fields).toMatchObject([
      { id: 'aiKnowledgeLevel', required: true, complete: true },
      { id: 'whyThisEvent', required: false, complete: true }
    ])
    expect(experience.readyToSubmit).toBe(true)
  })

  test('keeps Hackathon tracks out, includes team rows and commitments, and flags malformed optional email', () => {
    const configuration = createConfiguration({
      event: {
        ...createConfiguration().event,
        eventType: 'hackathon',
        inPersonEvent: true,
        applicationTeamIntentVisible: true,
        applicationAiKnowledgeVisible: true,
        requireTeamIntent: true,
        requireAiKnowledge: true
      },
      trackOptions: [{ id: 'agents', name: 'Agents', shortDescription: 'Build agents.', displayOrder: 0 }],
      maxTeamMembers: 3,
      hasCurrentApplicationTerms: true
    })
    const form = createForm({
      inPersonAttendanceCommitment: true,
      termsAccepted: true,
      aiKnowledgeLevel: 'advanced',
      teamIntent: 'team',
      teamMemberHints: [
        { fullName: 'Grace Hopper', email: 'not-an-email' },
        { fullName: '', email: '' }
      ],
      profileForm: { ...createForm().profileForm, firstName: 'Ada', familyName: 'Lovelace' }
    })
    const errors = getParticipantRegistrationValidationErrors(configuration, form)
    const experience = buildParticipantRegistrationExperience({ configuration, form, errors, showErrors: true })

    expect(experience.sections.find(section => section.id === 'application')?.fields.map(field => field.id)).toEqual(['aiKnowledgeLevel'])
    expect(experience.sections.find(section => section.id === 'participation')?.fields.map(field => field.id)).toContain('teamMemberHints.0.email')
    expect(errors['teamMemberHints.0.email']).toBe('Enter a valid email address.')
    expect(experience).toMatchObject({ invalidFieldCount: 1, firstInvalidFieldId: 'teamMemberHints.0.email', readyToSubmit: false })
  })

  test('combines Meetup registration with CFP custom question types and counts only required items', () => {
    const configuration = createConfiguration({ combineRegistrationSections: true })
    const form = createForm({
      profileForm: { ...createForm().profileForm, firstName: 'Ada', familyName: 'Lovelace' }
    })
    const experience = buildParticipantRegistrationExperience({
      configuration,
      form,
      showErrors: true,
      additionalSections: [{
        id: 'talk-proposal',
        title: 'Talk proposal',
        summary: 'Title, abstract, and proposal questions',
        targetId: 'registration-section-talk-proposal',
        fields: [
          { id: 'talkProposal.title', label: 'Title', required: true, complete: true, error: '' },
          { id: 'talkProposal.abstract', label: 'Abstract', required: true, complete: false, error: 'Enter a talk abstract.' },
          { id: 'talkProposal.demoOrSlidesUrl', label: 'Demo or slides URL', required: false, complete: true, error: '' },
          { id: 'talkProposal.question.phone', label: 'Phone', required: true, complete: true, error: '' },
          { id: 'talkProposal.question.demo', label: 'Live demo', required: true, complete: true, error: '' },
          { id: 'talkProposal.question.readiness', label: 'Readiness', required: true, complete: true, error: '' },
          { id: 'talkProposal.question.format', label: 'Format', required: true, complete: true, error: '' }
        ]
      }]
    })

    expect(experience.sections.map(section => section.id)).toEqual(['registration', 'talk-proposal', 'confirmation'])
    expect(experience.requiredCount).toBe(8)
    expect(experience.completedRequiredCount).toBe(7)
    expect(experience.firstInvalidFieldId).toBe('talkProposal.abstract')
    expect(experience.invalidFieldCount).toBe(1)
  })

  test('ignores hidden fields but blocks a malformed populated optional field', () => {
    const configuration = createConfiguration({
      profileFields: [
        { key: 'githubProfileUrl', label: 'GitHub profile URL', visible: false, required: false },
        { key: 'linkedinProfileUrl', label: 'LinkedIn profile URL', visible: true, required: false }
      ]
    })
    const form = createForm({
      profileForm: {
        ...createForm().profileForm,
        firstName: 'Ada',
        familyName: 'Lovelace',
        githubProfileUrl: 'not-a-url',
        linkedinProfileUrl: 'not-a-url'
      }
    })
    const errors = getParticipantRegistrationValidationErrors(configuration, form)
    const experience = buildParticipantRegistrationExperience({ configuration, form, errors, showErrors: true })

    expect(errors['profileForm.githubProfileUrl']).toBeUndefined()
    expect(errors['profileForm.linkedinProfileUrl']).toBe('Use a linkedin.com profile URL.')
    expect(experience.readyToSubmit).toBe(false)
    expect(experience.sections.find(section => section.id === 'links')?.state).toBe('error')
  })
})
