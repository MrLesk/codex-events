<script setup lang="ts">
import type { EventFormState } from '~/domains/events/admin-event'

type BooleanFieldKey = {
  [Key in keyof EventFormState]: EventFormState[Key] extends boolean ? Key : never
}[keyof EventFormState]

interface ApplicationFieldRow {
  id: string
  label: string
  visibleKey?: BooleanFieldKey
  requiredKey?: BooleanFieldKey
  locked?: boolean
}

const form = defineModel<EventFormState>('form', {
  required: true
})

const fieldRows: ApplicationFieldRow[] = [
  {
    id: 'first-name',
    label: 'First name',
    locked: true
  },
  {
    id: 'family-name',
    label: 'Family name',
    locked: true
  },
  {
    id: 'x-profile',
    label: 'X profile',
    visibleKey: 'applicationXProfileVisible',
    requiredKey: 'requireXProfile'
  },
  {
    id: 'linkedin-profile',
    label: 'LinkedIn profile',
    visibleKey: 'applicationLinkedinProfileVisible',
    requiredKey: 'requireLinkedinProfile'
  },
  {
    id: 'github-profile',
    label: 'GitHub profile',
    visibleKey: 'applicationGithubProfileVisible',
    requiredKey: 'requireGithubProfile'
  },
  {
    id: 'chatgpt-email',
    label: 'ChatGPT email',
    visibleKey: 'applicationChatgptEmailVisible',
    requiredKey: 'requireChatgptEmail'
  },
  {
    id: 'openai-org-id',
    label: 'OpenAI org ID',
    visibleKey: 'applicationOpenaiOrgIdVisible',
    requiredKey: 'requireOpenaiOrgId'
  },
  {
    id: 'luma-email',
    label: 'Luma email',
    visibleKey: 'applicationLumaEmailVisible',
    requiredKey: 'requireLumaEmail'
  },
  {
    id: 'why-this-event',
    label: 'Why this event',
    visibleKey: 'applicationWhyThisEventVisible',
    requiredKey: 'requireWhyThisEvent'
  },
  {
    id: 'proof-of-execution',
    label: 'Proof-of-execution links',
    visibleKey: 'applicationProofOfExecutionVisible',
    requiredKey: 'requireProofOfExecution'
  },
  {
    id: 'participation-mode',
    label: 'Participation mode',
    visibleKey: 'applicationTeamIntentVisible',
    requiredKey: 'requireTeamIntent'
  }
]

function isFieldVisible(row: ApplicationFieldRow) {
  return row.locked || (row.visibleKey ? form.value[row.visibleKey] : false)
}

function isFieldRequired(row: ApplicationFieldRow) {
  return row.locked || (row.requiredKey ? form.value[row.requiredKey] : false)
}

function setFieldVisible(row: ApplicationFieldRow, visible: boolean) {
  if (!row.visibleKey) {
    return
  }

  form.value[row.visibleKey] = visible

  if (!visible && row.requiredKey) {
    form.value[row.requiredKey] = false
  }
}

function setFieldRequired(row: ApplicationFieldRow, required: boolean) {
  if (!row.requiredKey) {
    return
  }

  form.value[row.requiredKey] = required

  if (required && row.visibleKey) {
    form.value[row.visibleKey] = true
  }
}

function handleVisibleChange(row: ApplicationFieldRow, event: Event) {
  setFieldVisible(row, (event.target as HTMLInputElement | null)?.checked ?? false)
}

function handleRequiredChange(row: ApplicationFieldRow, event: Event) {
  setFieldRequired(row, (event.target as HTMLInputElement | null)?.checked ?? false)
}
</script>

<template>
  <div class="grid grid-cols-1 gap-3">
    <div class="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-3 border-b border-black/8 pb-2 text-xs font-semibold uppercase text-muted dark:border-white/[0.08]">
      <span>Field name</span>
      <span class="text-center">Visible</span>
      <span class="text-center">Required</span>
    </div>

    <div class="grid grid-cols-1">
      <div
        v-for="row in fieldRows"
        :key="row.id"
        class="grid grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] items-center gap-3 border-b border-black/6 py-3 text-sm last:border-b-0 dark:border-white/[0.06]"
      >
        <div class="min-w-0">
          <p class="truncate font-medium text-toned">
            {{ row.label }}
          </p>
        </div>

        <label class="flex justify-center">
          <input
            type="checkbox"
            class="size-4 rounded border-black/20 dark:border-white/[0.3]"
            :checked="isFieldVisible(row)"
            :disabled="row.locked"
            :aria-label="`Show ${row.label}`"
            @change="handleVisibleChange(row, $event)"
          >
        </label>

        <label class="flex justify-center">
          <input
            type="checkbox"
            class="size-4 rounded border-black/20 disabled:cursor-not-allowed disabled:opacity-45 dark:border-white/[0.3]"
            :checked="isFieldRequired(row)"
            :disabled="row.locked || !isFieldVisible(row)"
            :aria-label="`Require ${row.label}`"
            @change="handleRequiredChange(row, $event)"
          >
        </label>
      </div>
    </div>

    <p class="text-xs text-muted">
      Current settings apply when someone views or submits the application form.
    </p>
  </div>
</template>
