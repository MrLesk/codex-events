<script setup lang="ts">
import type { TermsDocument } from '~/domains/hackathons/records'

const props = defineProps<{
  applicationTermsDraft: string
  winnerTermsDraft: string
  currentApplicationTerms: TermsDocument | null
  currentWinnerTerms: TermsDocument | null
  savingTermsDocumentType: TermsDocument['documentType'] | null
}>()

const emit = defineEmits<{
  'update:applicationTermsDraft': [value: string]
  'update:winnerTermsDraft': [value: string]
  'saveTerms': [documentType: TermsDocument['documentType']]
}>()

const applicationTermsDraftModel = computed({
  get: () => props.applicationTermsDraft,
  set: (value: string) => emit('update:applicationTermsDraft', value)
})

const winnerTermsDraftModel = computed({
  get: () => props.winnerTermsDraft,
  set: (value: string) => emit('update:winnerTermsDraft', value)
})
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <h2 class="text-lg font-semibold text-highlighted">
        Terms
      </h2>
    </template>

    <div class="grid gap-6 xl:grid-cols-2">
      <section class="min-w-0 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-semibold text-highlighted">
            Application terms
          </h3>
          <p class="text-xs text-muted">
            {{ currentApplicationTerms ? `Current v${currentApplicationTerms.version}` : 'No published version' }}
          </p>
        </div>

        <div class="space-y-4">
          <LazyAdminMarkdownEditorField
            v-model="applicationTermsDraftModel"
            name="application-terms-editor"
            editor-id="application-terms-editor"
            label="Content"
            placeholder="Enter the application terms."
            required
          />

          <div class="flex justify-end">
            <AppButton
              type="button"
              color="primary"
              size="md"
              :loading="savingTermsDocumentType === 'application_terms'"
              :disabled="savingTermsDocumentType !== null"
              @click="emit('saveTerms', 'application_terms')"
            >
              Save application terms
            </AppButton>
          </div>
        </div>
      </section>

      <section class="min-w-0 space-y-4 border-t border-black/8 pt-6 dark:border-white/[0.08] xl:border-t-0 xl:border-l xl:pt-0 xl:pl-6">
        <div class="flex items-center justify-between gap-3">
          <h3 class="text-base font-semibold text-highlighted">
            Winner terms
          </h3>
          <p class="text-xs text-muted">
            {{ currentWinnerTerms ? `Current v${currentWinnerTerms.version}` : 'No published version' }}
          </p>
        </div>

        <div class="space-y-4">
          <LazyAdminMarkdownEditorField
            v-model="winnerTermsDraftModel"
            name="winner-terms-editor"
            editor-id="winner-terms-editor"
            label="Content"
            placeholder="Enter the winner terms."
            required
          />

          <div class="flex justify-end">
            <AppButton
              type="button"
              color="primary"
              size="md"
              :loading="savingTermsDocumentType === 'winner_terms'"
              :disabled="savingTermsDocumentType !== null"
              @click="emit('saveTerms', 'winner_terms')"
            >
              Save winner terms
            </AppButton>
          </div>
        </div>
      </section>
    </div>
  </AppCard>
</template>
