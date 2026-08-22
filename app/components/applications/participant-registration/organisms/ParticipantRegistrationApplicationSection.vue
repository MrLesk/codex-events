<script setup lang="ts">
import type { PublicEvent } from '~/domains/events/presentation'
import type {
  ParticipantAiKnowledgeLevelInput,
  ParticipantRegistrationTrackOption
} from '~/domains/applications/participant-application'
import {
  aiKnowledgeLevelOptionLabels,
  aiKnowledgeLevelValues
} from '~/domains/applications/participant-application'
import ParticipantRegistrationField from '~/components/applications/participant-registration/molecules/ParticipantRegistrationField.vue'

const props = defineProps<{
  event: Pick<PublicEvent,
  | 'eventType'
  | 'applicationWhyThisEventVisible'
  | 'applicationProofOfExecutionVisible'
  | 'applicationAiKnowledgeVisible'
  | 'requireWhyThisEvent'
  | 'requireProofOfExecution'
  | 'requireAiKnowledge'
  >
  trackOptions: ParticipantRegistrationTrackOption[]
  selectedTrackId: string
  aiKnowledgeLevel: ParticipantAiKnowledgeLevelInput
  whyThisEvent: string
  proofOfExecutionUrl: string
  errors: Record<string, string>
  disabled?: boolean
}>()

const emit = defineEmits<{
  updateSelectedTrackId: [value: string]
  updateAiKnowledgeLevel: [value: ParticipantAiKnowledgeLevelInput]
  updateWhyThisEvent: [value: string]
  updateProofOfExecutionUrl: [value: string]
}>()

const sortedTrackOptions = computed(() => [...props.trackOptions].sort((left, right) =>
  left.displayOrder - right.displayOrder || left.name.localeCompare(right.name) || left.id.localeCompare(right.id)
))
const selectedTrack = computed(() => sortedTrackOptions.value.find(track => track.id === props.selectedTrackId) ?? null)
const showTrackSelection = computed(() => props.event.eventType === 'build' && sortedTrackOptions.value.length > 0)
const showAiKnowledge = computed(() => props.event.applicationAiKnowledgeVisible && !showTrackSelection.value)
const visible = computed(() =>
  showTrackSelection.value
  || showAiKnowledge.value
  || props.event.applicationWhyThisEventVisible
  || props.event.applicationProofOfExecutionVisible
)
</script>

<template>
  <section
    v-if="visible"
    id="registration-section-application"
    tabindex="-1"
    class="scroll-mt-24 space-y-4 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
  >
    <h2 class="text-[14px] font-semibold text-highlighted">
      Your application
    </h2>

    <ParticipantRegistrationField
      v-if="showTrackSelection"
      field-id="selectedTrackId"
      label="Track"
      required
      label-for="participant-registration-track"
      :error="props.errors.selectedTrackId"
    >
      <AppSelect
        id="participant-registration-track"
        :model-value="props.selectedTrackId"
        :disabled="props.disabled"
        @update:model-value="emit('updateSelectedTrackId', String($event ?? ''))"
      >
        <option value="">
          Choose your track
        </option>
        <option
          v-for="track in sortedTrackOptions"
          :key="track.id"
          :value="track.id"
        >
          {{ track.name }}
        </option>
      </AppSelect>
      <template
        v-if="selectedTrack"
        #helper
      >
        <AppMarkdownRenderer
          :source="selectedTrack.shortDescription"
          class="max-w-[68ch]"
        />
      </template>
    </ParticipantRegistrationField>

    <ParticipantRegistrationField
      v-if="showAiKnowledge"
      field-id="aiKnowledgeLevel"
      label="AI Knowledge"
      :required="props.event.requireAiKnowledge"
      label-for="participant-registration-ai-knowledge"
      :error="props.errors.aiKnowledgeLevel"
    >
      <AppSelect
        id="participant-registration-ai-knowledge"
        :model-value="props.aiKnowledgeLevel"
        :disabled="props.disabled"
        @update:model-value="emit('updateAiKnowledgeLevel', String($event ?? '') as ParticipantAiKnowledgeLevelInput)"
      >
        <option value="">
          Please select
        </option>
        <option
          v-for="level in aiKnowledgeLevelValues"
          :key="level"
          :value="level"
        >
          {{ aiKnowledgeLevelOptionLabels[level] }}
        </option>
      </AppSelect>
    </ParticipantRegistrationField>

    <ParticipantRegistrationField
      v-if="props.event.applicationWhyThisEventVisible"
      field-id="whyThisEvent"
      label="Why this event"
      :required="props.event.requireWhyThisEvent"
      label-for="participant-registration-why"
      :error="props.errors.whyThisEvent"
    >
      <AppTextarea
        id="participant-registration-why"
        :model-value="props.whyThisEvent"
        :disabled="props.disabled"
        :rows="5"
        placeholder="Share what you plan to build and learn."
        @update:model-value="emit('updateWhyThisEvent', String($event ?? ''))"
      />
    </ParticipantRegistrationField>

    <ParticipantRegistrationField
      v-if="props.event.applicationProofOfExecutionVisible"
      field-id="proofOfExecutionUrl"
      label="Proof of execution links"
      :required="props.event.requireProofOfExecution"
      label-for="participant-registration-proof"
      :error="props.errors.proofOfExecutionUrl"
    >
      <AppInput
        id="participant-registration-proof"
        :model-value="props.proofOfExecutionUrl"
        :disabled="props.disabled"
        type="text"
        inputmode="url"
        placeholder="https://github.com/your-project, https://demo.example.com"
        @update:model-value="emit('updateProofOfExecutionUrl', String($event ?? ''))"
      />
      <template #helper>
        Separate multiple links with commas.
      </template>
    </ParticipantRegistrationField>
  </section>
</template>
