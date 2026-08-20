<script setup lang="ts">
import type { TalkProposalQuestionDefinition } from '#shared/domains/talk-proposals/questions'
import AdminTalkProposalQuestionEditor from '~/components/admin/talk-proposals/organisms/AdminTalkProposalQuestionEditor.vue'

const enabled = defineModel<boolean>('enabled', { required: true })
const opensAt = defineModel<string>('opensAt', { required: true })
const closesAt = defineModel<string>('closesAt', { required: true })
const questions = defineModel<TalkProposalQuestionDefinition[]>('questions', { required: true })

const props = withDefaults(defineProps<{
  hasExistingProposal?: boolean
}>(), {
  hasExistingProposal: false
})

const configurationLocked = computed(() => props.hasExistingProposal)
</script>

<template>
  <section
    data-testid="talk-proposal-control"
    class="space-y-4"
  >
    <AppCheckbox
      v-model="enabled"
      :disabled="configurationLocked"
      label="Invite registered participants to propose one talk"
    />

    <p
      v-if="configurationLocked"
      class="text-sm text-muted"
    >
      Call for talks cannot be turned off after a Talk proposal has been created.
    </p>

    <div
      v-if="enabled"
      class="space-y-5"
    >
      <div class="grid gap-5 md:grid-cols-2">
        <label class="grid gap-2">
          <span class="text-sm font-medium text-toned">Opens</span>
          <AppDateTimeInput
            v-model="opensAt"
            picker-aria-label="Choose Call for talks open date and time"
            required
          />
        </label>

        <label class="grid gap-2">
          <span class="text-sm font-medium text-toned">Closes</span>
          <AppDateTimeInput
            v-model="closesAt"
            picker-aria-label="Choose Call for talks close date and time"
            required
          />
        </label>
      </div>

      <AdminTalkProposalQuestionEditor
        v-model="questions"
        :locked="configurationLocked"
      />
    </div>
  </section>
</template>
