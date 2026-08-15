<script setup lang="ts">
import type { EventFormState } from '~/domains/events/admin-event'

const form = defineModel<EventFormState>('form', { required: true })

defineProps<{
  nameError?: string
  slugError?: string
}>()

const emit = defineEmits<{
  slugEdited: []
}>()
</script>

<template>
  <div class="grid gap-4 sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
    <AppFormField
      name="event-builder-name"
      label="Event name"
    >
      <AppInput
        id="event-builder-name"
        v-model="form.name"
        data-testid="event-builder-name"
        placeholder="Codex Community Meetup"
        autocomplete="off"
        :aria-invalid="Boolean(nameError)"
        :aria-describedby="nameError ? 'event-builder-name-error' : undefined"
      />
      <p
        v-if="nameError"
        id="event-builder-name-error"
        class="mt-1.5 text-xs text-rose-500"
      >
        {{ nameError }}
      </p>
    </AppFormField>

    <AppFormField
      name="event-builder-slug"
      label="URL slug"
    >
      <div class="flex items-center gap-1.5">
        <span class="shrink-0 text-xs tabular-nums text-dimmed">/events/</span>
        <AppInput
          id="event-builder-slug"
          v-model="form.slug"
          data-testid="event-builder-slug"
          placeholder="codex-community-meetup"
          :aria-invalid="Boolean(slugError)"
          :aria-describedby="slugError ? 'event-builder-slug-error' : undefined"
          @update:model-value="emit('slugEdited')"
        />
      </div>
      <p
        v-if="slugError"
        id="event-builder-slug-error"
        class="mt-1.5 text-xs text-rose-500"
      >
        {{ slugError }}
      </p>
    </AppFormField>
  </div>
</template>
