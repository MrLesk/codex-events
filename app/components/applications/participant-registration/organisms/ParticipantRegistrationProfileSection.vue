<script setup lang="ts">
import type { EventProfileField } from '~/domains/applications/participant-application'
import type {
  ParticipantRegistrationProfileForm,
  ParticipantRegistrationProfileFormKey
} from '~/domains/applications/participant-application-form'
import ParticipantRegistrationField from '~/components/applications/participant-registration/molecules/ParticipantRegistrationField.vue'

const props = defineProps<{
  profileForm: ParticipantRegistrationProfileForm
  profileFields: EventProfileField[]
  errors: Record<string, string>
  disabled?: boolean
  sectionLabel?: string
}>()

const emit = defineEmits<{
  updateField: [key: ParticipantRegistrationProfileFormKey, value: string]
}>()

const primaryFields = computed(() => props.profileFields.filter(field =>
  field.visible && field.key !== 'chatgptEmail' && field.key !== 'openaiOrgId'
))
const openAiFields = computed(() => props.profileFields.filter(field =>
  field.visible && (field.key === 'chatgptEmail' || field.key === 'openaiOrgId')
))

function fieldId(key: ParticipantRegistrationProfileFormKey) {
  return `profileForm.${key}`
}

function inputId(key: ParticipantRegistrationProfileFormKey) {
  return `participant-registration-${key}`
}

function fieldType(key: EventProfileField['key']) {
  return key === 'chatgptEmail' || key === 'lumaEmail' ? 'email' : 'text'
}

function fieldInputMode(key: EventProfileField['key']) {
  return key.includes('Url') ? 'url' : undefined
}

function placeholder(key: EventProfileField['key']) {
  const placeholders: Record<EventProfileField['key'], string> = {
    xProfileUrl: 'https://x.com/your-name',
    linkedinProfileUrl: 'https://linkedin.com/in/your-name',
    githubProfileUrl: 'https://github.com/your-name',
    chatgptEmail: 'you@example.com',
    openaiOrgId: 'org_123abc',
    lumaEmail: 'you@example.com'
  }

  return placeholders[key]
}
</script>

<template>
  <div class="space-y-6">
    <section
      id="registration-section-details"
      tabindex="-1"
      class="scroll-mt-24 space-y-3 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
    >
      <h2 class="text-[14px] font-semibold text-highlighted">
        {{ props.sectionLabel ?? 'Your details' }}
      </h2>
      <div class="grid gap-3 md:grid-cols-2">
        <ParticipantRegistrationField
          field-id="profileForm.firstName"
          label="First name"
          required
          label-for="participant-registration-firstName"
          :error="props.errors['profileForm.firstName']"
        >
          <AppInput
            id="participant-registration-firstName"
            :model-value="props.profileForm.firstName"
            :disabled="props.disabled"
            placeholder="Ada"
            @update:model-value="emit('updateField', 'firstName', String($event ?? ''))"
          />
        </ParticipantRegistrationField>

        <ParticipantRegistrationField
          field-id="profileForm.familyName"
          label="Family name"
          required
          label-for="participant-registration-familyName"
          :error="props.errors['profileForm.familyName']"
        >
          <AppInput
            id="participant-registration-familyName"
            :model-value="props.profileForm.familyName"
            :disabled="props.disabled"
            placeholder="Lovelace"
            @update:model-value="emit('updateField', 'familyName', String($event ?? ''))"
          />
        </ParticipantRegistrationField>
      </div>
    </section>

    <section
      v-if="primaryFields.length > 0"
      id="registration-section-links"
      tabindex="-1"
      class="scroll-mt-24 space-y-3 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
    >
      <h2 class="text-[14px] font-semibold text-highlighted">
        Links and accounts
      </h2>
      <div class="grid gap-3 md:grid-cols-2">
        <ParticipantRegistrationField
          v-for="field in primaryFields"
          :key="field.key"
          :field-id="fieldId(field.key)"
          :label="field.label"
          :required="field.required"
          :label-for="inputId(field.key)"
          :error="props.errors[fieldId(field.key)]"
        >
          <AppInput
            :id="inputId(field.key)"
            :model-value="props.profileForm[field.key]"
            :type="fieldType(field.key)"
            :inputmode="fieldInputMode(field.key)"
            :disabled="props.disabled"
            :placeholder="placeholder(field.key)"
            @update:model-value="emit('updateField', field.key, String($event ?? ''))"
          />
          <template
            v-if="field.key === 'lumaEmail'"
            #helper
          >
            Enter the email you used to register for this event on Luma.
          </template>
        </ParticipantRegistrationField>
      </div>
    </section>

    <section
      v-if="openAiFields.length > 0"
      id="registration-section-openai"
      tabindex="-1"
      class="scroll-mt-24 space-y-3 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
    >
      <h2 class="text-[14px] font-semibold text-highlighted">
        OpenAI account details
      </h2>
      <div class="grid gap-3 md:grid-cols-2">
        <ParticipantRegistrationField
          v-for="field in openAiFields"
          :key="field.key"
          :field-id="fieldId(field.key)"
          :label="field.label"
          :required="field.required"
          :label-for="inputId(field.key)"
          :error="props.errors[fieldId(field.key)]"
        >
          <AppInput
            :id="inputId(field.key)"
            :model-value="props.profileForm[field.key]"
            :type="fieldType(field.key)"
            :disabled="props.disabled"
            :placeholder="placeholder(field.key)"
            @update:model-value="emit('updateField', field.key, String($event ?? ''))"
          />
          <template
            v-if="field.key === 'openaiOrgId'"
            #helper
          >
            Find your organization ID at
            <a
              href="https://platform.openai.com/orgid"
              target="_blank"
              rel="noreferrer"
              class="font-medium text-sky-700 underline-offset-2 hover:underline dark:text-sky-300"
            >platform.openai.com/orgid</a>.
          </template>
        </ParticipantRegistrationField>
      </div>
    </section>
  </div>
</template>
