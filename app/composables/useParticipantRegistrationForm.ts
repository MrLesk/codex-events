import type { Ref } from 'vue'
import type {
  ParticipantRegistrationAdditionalSection,
  ParticipantRegistrationConfiguration,
  ParticipantRegistrationFormState,
  ParticipantRegistrationProgressSection
} from '~/domains/applications/participant-registration-experience'

import {
  buildParticipantRegistrationExperience,
  getParticipantRegistrationValidationErrors
} from '~/domains/applications/participant-registration-experience'

export function useParticipantRegistrationForm(options: {
  form: Ref<ParticipantRegistrationFormState>
  configuration: () => ParticipantRegistrationConfiguration
  additionalSections?: () => ParticipantRegistrationAdditionalSection[]
}) {
  const submitAttempted = shallowRef(false)
  const validationErrors = computed(() => getParticipantRegistrationValidationErrors(
    options.configuration(),
    options.form.value
  ))
  const displayedErrors = computed(() => submitAttempted.value ? validationErrors.value : {})
  const experience = computed(() => buildParticipantRegistrationExperience({
    configuration: options.configuration(),
    form: options.form.value,
    errors: validationErrors.value,
    additionalSections: options.additionalSections?.() ?? [],
    showErrors: submitAttempted.value
  }))
  const readinessText = computed(() => {
    const remaining = experience.value.requiredCount - experience.value.completedRequiredCount

    if (remaining > 0) {
      return `${remaining} required item${remaining === 1 ? '' : 's'} left`
    }

    if (experience.value.invalidFieldCount > 0) {
      return experience.value.invalidFieldCount === 1
        ? '1 field needs attention'
        : `${experience.value.invalidFieldCount} fields need attention`
    }

    return 'Ready to submit'
  })
  const progressPercent = computed(() => experience.value.requiredCount === 0
    ? 100
    : Math.round((experience.value.completedRequiredCount / experience.value.requiredCount) * 100)
  )

  function scrollBehavior(): ScrollBehavior {
    if (typeof window === 'undefined') {
      return 'auto'
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
  }

  function findField(root: HTMLElement, fieldId: string) {
    return root.querySelector<HTMLElement>(`[data-registration-field="${CSS.escape(fieldId)}"]`)
  }

  function focusField(root: HTMLElement, fieldId: string) {
    const field = findField(root, fieldId)
    if (!field) {
      return false
    }

    const control = field.matches('input, select, textarea, button, [tabindex]')
      ? field
      : field.querySelector<HTMLElement>('input, select, textarea, button, [tabindex]')

    field.scrollIntoView({ behavior: scrollBehavior(), block: 'center' })
    control?.focus({ preventScroll: true })
    return true
  }

  function focusFirstInvalid(root: HTMLElement) {
    const firstInvalidFieldId = experience.value.firstInvalidFieldId

    if (firstInvalidFieldId && focusField(root, firstInvalidFieldId)) {
      return
    }

    const firstIncomplete = experience.value.sections
      .flatMap(section => section.fields)
      .find(field => field.required && !field.complete)

    if (firstIncomplete) {
      focusField(root, firstIncomplete.id)
    }
  }

  function navigateToSection(root: HTMLElement, section: ParticipantRegistrationProgressSection) {
    const target = root.querySelector<HTMLElement>(`#${CSS.escape(section.targetId)}`)
    if (!target) {
      return
    }

    target.scrollIntoView({ behavior: scrollBehavior(), block: 'start' })
    target.focus({ preventScroll: true })
  }

  async function validateSubmitAttempt(root: HTMLElement) {
    submitAttempted.value = true
    await nextTick()

    if (experience.value.readyToSubmit) {
      return true
    }

    focusFirstInvalid(root)
    return false
  }

  return {
    submitAttempted: readonly(submitAttempted),
    validationErrors,
    displayedErrors,
    experience,
    readinessText,
    progressPercent,
    validateSubmitAttempt,
    navigateToSection,
    focusFirstInvalid
  }
}
