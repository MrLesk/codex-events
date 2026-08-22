<script setup lang="ts">
import type {
  ParticipantRegistrationTeamIntent,
  ParticipantRegistrationTeamMemberHint
} from '~/domains/applications/participant-application'
import ParticipantRegistrationChoiceGroup from '~/components/applications/participant-registration/molecules/ParticipantRegistrationChoiceGroup.vue'
import ParticipantRegistrationField from '~/components/applications/participant-registration/molecules/ParticipantRegistrationField.vue'

const props = defineProps<{
  visible: boolean
  required: boolean
  eventType: 'hackathon' | 'meetup' | 'build'
  teamIntent: ParticipantRegistrationTeamIntent
  teamMemberHints: ParticipantRegistrationTeamMemberHint[]
  maxTeamMembers: number
  errors: Record<string, string>
  disabled?: boolean
}>()

const emit = defineEmits<{
  updateTeamIntent: [value: ParticipantRegistrationTeamIntent]
  updateTeamMember: [index: number, key: keyof ParticipantRegistrationTeamMemberHint, value: string]
}>()

const choices = [
  { value: 'solo', label: 'Solo', icon: 'i-lucide-user-round' },
  { value: 'team', label: 'Team', icon: 'i-lucide-users-round' },
  { value: 'unknown', label: 'I\'ll decide later', icon: 'i-lucide-circle-help' }
]
const maxTeammates = computed(() => Math.max(0, props.maxTeamMembers - 1))
</script>

<template>
  <section
    v-if="props.visible"
    id="registration-section-participation"
    tabindex="-1"
    class="scroll-mt-24 space-y-4 border-b border-black/8 pb-5 outline-none dark:border-white/[0.08]"
  >
    <div class="space-y-1">
      <h2 class="text-[14px] font-semibold text-highlighted">
        Participation
        <span
          v-if="props.required"
          class="ml-2 rounded-full border border-amber-500/35 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-amber-700 dark:text-amber-200"
        >Required</span>
      </h2>
      <p class="text-[12px] text-muted">
        How are you planning to participate?
      </p>
    </div>

    <ParticipantRegistrationChoiceGroup
      field-id="teamIntent"
      :model-value="props.teamIntent"
      :options="choices"
      :disabled="props.disabled"
      :error="props.errors.teamIntent"
      @update-model-value="emit('updateTeamIntent', $event as ParticipantRegistrationTeamIntent)"
    />

    <p class="text-[11px] leading-4 text-muted">
      {{ props.eventType === 'hackathon'
        ? 'This does not create your team. If approved, you can create or join one while team formation is open.'
        : 'This helps organizers understand whether you expect to participate alone or with others.' }}
    </p>

    <div
      v-if="props.eventType === 'hackathon' && props.teamIntent === 'team' && maxTeammates > 0"
      class="space-y-3"
    >
      <h3 class="text-[13px] font-medium text-highlighted">
        Teammates (up to {{ maxTeammates }})
      </h3>
      <div class="divide-y divide-black/8 border-y border-black/8 dark:divide-white/[0.08] dark:border-white/[0.08]">
        <div
          v-for="(member, index) in props.teamMemberHints"
          :key="index"
          class="grid gap-2 py-3 md:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)] md:items-start"
        >
          <p class="pt-3 text-[12px] font-medium text-toned">
            Teammate {{ index + 1 }}
          </p>
          <ParticipantRegistrationField
            :field-id="`teamMemberHints.${index}.fullName`"
            label="Name and family name"
            :label-for="`participant-registration-teammate-${index}-name`"
            :error="props.errors[`teamMemberHints.${index}.fullName`]"
          >
            <AppInput
              :id="`participant-registration-teammate-${index}-name`"
              :model-value="member.fullName"
              :disabled="props.disabled"
              placeholder="Name and family name"
              @update:model-value="emit('updateTeamMember', index, 'fullName', String($event ?? ''))"
            />
          </ParticipantRegistrationField>
          <ParticipantRegistrationField
            :field-id="`teamMemberHints.${index}.email`"
            label="Email"
            :label-for="`participant-registration-teammate-${index}-email`"
            :error="props.errors[`teamMemberHints.${index}.email`]"
          >
            <AppInput
              :id="`participant-registration-teammate-${index}-email`"
              :model-value="member.email"
              :disabled="props.disabled"
              type="email"
              placeholder="Email"
              @update:model-value="emit('updateTeamMember', index, 'email', String($event ?? ''))"
            />
          </ParticipantRegistrationField>
        </div>
      </div>
    </div>
  </section>
</template>
