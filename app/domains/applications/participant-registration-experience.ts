import type { PublicEvent } from '~/domains/events/presentation'
import type {
  EventProfileField,
  ParticipantAiKnowledgeLevelInput,
  ParticipantRegistrationTeamIntent,
  ParticipantRegistrationTeamMemberHint,
  ParticipantRegistrationTrackOption
} from '~/domains/applications/participant-application'
import type { ParticipantRegistrationProfileForm } from '~/domains/applications/participant-application-form'

import { buildParticipantRegistrationFormSchema } from '~/domains/applications/participant-application-form'

export interface ParticipantRegistrationFormState {
  termsAccepted: boolean
  inPersonAttendanceCommitment: boolean
  whyThisEvent: string
  proofOfExecutionUrl: string
  aiKnowledgeLevel: ParticipantAiKnowledgeLevelInput
  selectedTrackId: string
  teamIntent: ParticipantRegistrationTeamIntent
  teamMemberHints: ParticipantRegistrationTeamMemberHint[]
  profileForm: ParticipantRegistrationProfileForm
}

export interface ParticipantRegistrationConfiguration {
  event: Pick<PublicEvent,
  | 'eventType'
  | 'inPersonEvent'
  | 'applicationWhyThisEventVisible'
  | 'applicationProofOfExecutionVisible'
  | 'applicationTeamIntentVisible'
  | 'applicationAiKnowledgeVisible'
  | 'requireWhyThisEvent'
  | 'requireProofOfExecution'
  | 'requireTeamIntent'
  | 'requireAiKnowledge'
  >
  profileFields: EventProfileField[]
  trackOptions: ParticipantRegistrationTrackOption[]
  maxTeamMembers: number
  hasCurrentApplicationTerms: boolean
  combineRegistrationSections?: boolean
}

export interface ParticipantRegistrationProgressField {
  id: string
  label: string
  required: boolean
  complete: boolean
  error: string
}

export interface ParticipantRegistrationAdditionalSection {
  id: string
  title: string
  summary: string
  targetId: string
  fields: ParticipantRegistrationProgressField[]
}

export interface ParticipantRegistrationProgressSection extends ParticipantRegistrationAdditionalSection {
  state: 'complete' | 'incomplete' | 'error'
  requiredCount: number
  completedRequiredCount: number
  invalidFieldCount: number
}

export interface ParticipantRegistrationExperience {
  sections: ParticipantRegistrationProgressSection[]
  requiredCount: number
  completedRequiredCount: number
  invalidFieldCount: number
  firstInvalidFieldId: string | null
  readyToSubmit: boolean
}

function isFilled(value: unknown) {
  return typeof value === 'string' ? value.trim().length > 0 : value === true
}

function profileFieldId(key: keyof ParticipantRegistrationProfileForm) {
  return `profileForm.${key}`
}

function createField(options: {
  id: string
  label: string
  required: boolean
  value: unknown
  errors: Record<string, string>
}): ParticipantRegistrationProgressField {
  const error = options.errors[options.id] ?? ''

  return {
    id: options.id,
    label: options.label,
    required: options.required,
    complete: options.required ? isFilled(options.value) && !error : !error,
    error
  }
}

function createSection(options: Omit<ParticipantRegistrationAdditionalSection, 'summary'> & { summary?: string }) {
  return {
    ...options,
    summary: options.summary ?? options.fields.map(field => field.label).join(', ')
  }
}

export function getParticipantRegistrationValidationErrors(
  configuration: ParticipantRegistrationConfiguration,
  form: ParticipantRegistrationFormState
) {
  const showTrackSelection = configuration.event.eventType === 'build' && configuration.trackOptions.length > 0
  const schema = buildParticipantRegistrationFormSchema({
    profileFields: configuration.profileFields,
    maxTeamMembers: configuration.maxTeamMembers,
    hasCurrentApplicationTerms: configuration.hasCurrentApplicationTerms,
    isInPersonEvent: configuration.event.inPersonEvent,
    showWhyThisEvent: configuration.event.applicationWhyThisEventVisible,
    requireWhyThisEvent: configuration.event.requireWhyThisEvent,
    showProofOfExecution: configuration.event.applicationProofOfExecutionVisible,
    requireProofOfExecution: configuration.event.requireProofOfExecution,
    showTeamIntent: configuration.event.applicationTeamIntentVisible,
    requireTeamIntent: configuration.event.requireTeamIntent,
    showAiKnowledge: configuration.event.applicationAiKnowledgeVisible && !showTrackSelection,
    requireAiKnowledge: configuration.event.requireAiKnowledge,
    showTrackSelection,
    trackIds: configuration.trackOptions.map(track => track.id)
  })
  const result = schema.safeParse(form)

  if (result.success) {
    return {}
  }

  const errors: Record<string, string> = {}

  for (const issue of result.error.issues) {
    const id = issue.path.join('.')
    if (id && !errors[id]) {
      errors[id] = issue.message
    }
  }

  return errors
}

export function buildParticipantRegistrationExperience(options: {
  configuration: ParticipantRegistrationConfiguration
  form: ParticipantRegistrationFormState
  errors?: Record<string, string>
  additionalSections?: ParticipantRegistrationAdditionalSection[]
  showErrors?: boolean
}): ParticipantRegistrationExperience {
  const { configuration, form } = options
  const errors = options.errors ?? getParticipantRegistrationValidationErrors(configuration, form)
  const visibleProfileFields = configuration.profileFields.filter(field => field.visible)
  const linksFields = visibleProfileFields.filter(field => field.key !== 'chatgptEmail' && field.key !== 'openaiOrgId')
  const openAiFields = visibleProfileFields.filter(field => field.key === 'chatgptEmail' || field.key === 'openaiOrgId')
  const showTrackSelection = configuration.event.eventType === 'build' && configuration.trackOptions.length > 0
  const showAiKnowledge = configuration.event.applicationAiKnowledgeVisible && !showTrackSelection
  const sections: ParticipantRegistrationAdditionalSection[] = []

  sections.push(createSection({
    id: 'details',
    title: 'Your details',
    targetId: 'registration-section-details',
    fields: [
      createField({ id: profileFieldId('firstName'), label: 'First name', required: true, value: form.profileForm.firstName, errors }),
      createField({ id: profileFieldId('familyName'), label: 'Family name', required: true, value: form.profileForm.familyName, errors })
    ]
  }))

  if (linksFields.length > 0) {
    sections.push(createSection({
      id: 'links',
      title: 'Links and accounts',
      targetId: 'registration-section-links',
      fields: linksFields.map(field => createField({
        id: profileFieldId(field.key),
        label: field.label,
        required: field.required,
        value: form.profileForm[field.key],
        errors
      }))
    }))
  }

  if (openAiFields.length > 0) {
    sections.push(createSection({
      id: 'openai',
      title: 'OpenAI account details',
      targetId: 'registration-section-openai',
      fields: openAiFields.map(field => createField({
        id: profileFieldId(field.key),
        label: field.label,
        required: field.required,
        value: form.profileForm[field.key],
        errors
      }))
    }))
  }

  const applicationFields: ParticipantRegistrationProgressField[] = []

  if (showTrackSelection) {
    applicationFields.push(createField({ id: 'selectedTrackId', label: 'Track', required: true, value: form.selectedTrackId, errors }))
  } else if (showAiKnowledge) {
    applicationFields.push(createField({
      id: 'aiKnowledgeLevel',
      label: 'AI Knowledge',
      required: configuration.event.requireAiKnowledge,
      value: form.aiKnowledgeLevel,
      errors
    }))
  }

  if (configuration.event.applicationWhyThisEventVisible) {
    applicationFields.push(createField({
      id: 'whyThisEvent',
      label: 'Why this event',
      required: configuration.event.requireWhyThisEvent,
      value: form.whyThisEvent,
      errors
    }))
  }

  if (configuration.event.applicationProofOfExecutionVisible) {
    applicationFields.push(createField({
      id: 'proofOfExecutionUrl',
      label: 'Proof of execution links',
      required: configuration.event.requireProofOfExecution,
      value: form.proofOfExecutionUrl,
      errors
    }))
  }

  if (applicationFields.length > 0) {
    sections.push(createSection({
      id: 'application',
      title: 'Your application',
      targetId: 'registration-section-application',
      fields: applicationFields
    }))
  }

  if (configuration.event.applicationTeamIntentVisible) {
    const participationFields = [createField({
      id: 'teamIntent',
      label: 'Participation mode',
      required: configuration.event.requireTeamIntent,
      value: form.teamIntent === 'unknown' ? '' : form.teamIntent,
      errors
    })]

    if (form.teamIntent === 'team') {
      participationFields.push(...form.teamMemberHints.flatMap((member, index) => [
        createField({
          id: `teamMemberHints.${index}.fullName`,
          label: `Teammate ${index + 1} name`,
          required: false,
          value: member.fullName,
          errors
        }),
        createField({
          id: `teamMemberHints.${index}.email`,
          label: `Teammate ${index + 1} email`,
          required: false,
          value: member.email,
          errors
        })
      ]))
    }

    sections.push(createSection({
      id: 'participation',
      title: 'Participation',
      summary: 'Participation mode and teammates',
      targetId: 'registration-section-participation',
      fields: participationFields
    }))
  }

  if (configuration.event.inPersonEvent) {
    sections.push(createSection({
      id: 'attendance',
      title: 'In-person attendance commitment',
      targetId: 'registration-section-attendance',
      fields: [createField({
        id: 'inPersonAttendanceCommitment',
        label: 'Attendance confirmation',
        required: true,
        value: form.inPersonAttendanceCommitment,
        errors
      })]
    }))
  }

  if (configuration.hasCurrentApplicationTerms) {
    sections.push(createSection({
      id: 'terms',
      title: 'Application terms',
      targetId: 'registration-section-terms',
      fields: [createField({
        id: 'termsAccepted',
        label: 'Accept Application Terms',
        required: true,
        value: form.termsAccepted,
        errors
      })]
    }))
  }

  if (configuration.combineRegistrationSections) {
    const combinedFields = sections.flatMap(section => section.fields)
    sections.splice(0, sections.length, createSection({
      id: 'registration',
      title: 'Event registration',
      summary: 'Your details and event commitments',
      targetId: 'registration-section-details',
      fields: combinedFields
    }))
  }

  sections.push(...(options.additionalSections ?? []))

  const progressSections = sections.map((section): ParticipantRegistrationProgressSection => {
    const requiredFields = section.fields.filter(field => field.required)
    const invalidFields = section.fields.filter(field => field.error)
    const completedRequiredCount = requiredFields.filter(field => field.complete).length
    const state = invalidFields.length > 0 && options.showErrors
      ? 'error'
      : completedRequiredCount === requiredFields.length
        ? 'complete'
        : 'incomplete'

    return {
      ...section,
      state,
      requiredCount: requiredFields.length,
      completedRequiredCount,
      invalidFieldCount: invalidFields.length
    }
  })
  const requiredCount = progressSections.reduce((total, section) => total + section.requiredCount, 0)
  const completedRequiredCount = progressSections.reduce((total, section) => total + section.completedRequiredCount, 0)
  const invalidFieldCount = progressSections.reduce((total, section) => total + section.invalidFieldCount, 0)
  const readyToSubmit = completedRequiredCount === requiredCount && invalidFieldCount === 0
  const firstInvalidFieldId = progressSections
    .flatMap(section => section.fields)
    .find(field => field.error)?.id ?? null

  progressSections.push({
    id: 'confirmation',
    title: 'Review and submit',
    summary: 'Confirm your registration',
    targetId: 'registration-section-confirmation',
    fields: [],
    state: readyToSubmit ? 'complete' : 'incomplete',
    requiredCount: 0,
    completedRequiredCount: 0,
    invalidFieldCount: 0
  })

  return {
    sections: progressSections,
    requiredCount,
    completedRequiredCount,
    invalidFieldCount,
    firstInvalidFieldId,
    readyToSubmit
  }
}
