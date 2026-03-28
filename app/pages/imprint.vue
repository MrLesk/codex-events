<script setup lang="ts">
import { renderMarkdown } from '~/utils/markdown'
import {
  platformImprintContactApiPath,
  platformImprintMarkdown,
  platformLegalLastUpdatedLabel,
  platformPrivacyEmail,
  platformSupportEmail
} from '../../shared/platform-legal'

const imprintHtml = computed(() => renderMarkdown(platformImprintMarkdown))

const contactForm = reactive({
  name: '',
  email: '',
  message: '',
  website: ''
})

const contactState = reactive({
  pending: false,
  success: '',
  error: ''
})

function extractErrorMessage(error: unknown, fallback: string) {
  if (error && typeof error === 'object' && 'data' in error) {
    const data = (error as { data?: { error?: { message?: string } } }).data
    const message = data?.error?.message?.trim()

    if (message) {
      return message
    }
  }

  return error instanceof Error ? error.message : fallback
}

async function submitContactForm() {
  contactState.pending = true
  contactState.success = ''
  contactState.error = ''

  try {
    await $fetch(platformImprintContactApiPath, {
      method: 'POST',
      body: {
        name: contactForm.name,
        email: contactForm.email,
        message: contactForm.message,
        website: contactForm.website
      }
    })

    contactForm.name = ''
    contactForm.email = ''
    contactForm.message = ''
    contactForm.website = ''
    contactState.success = 'Message sent. We will reply to the email address you provided.'
  } catch (error) {
    contactState.error = extractErrorMessage(error, 'Unable to send your message right now.')
  } finally {
    contactState.pending = false
  }
}

useSeoMeta({
  title: 'Imprint',
  description: 'Legal notice and contact details for Codex Hackathons.'
})
</script>

<template>
  <div class="relative isolate pb-24">
    <section class="relative z-10 border-b border-black/8 bg-white/52 backdrop-blur-lg dark:border-white/[0.08] dark:bg-black/56">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <NuxtLink
          to="/"
          class="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-600 transition-colors hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white"
        >
          <AppIcon
            name="i-lucide-arrow-left"
            class="size-4"
          />
          Back to hackathons
        </NuxtLink>

        <div class="mt-3 border-b border-black/8 pb-4 dark:border-white/[0.08]">
          <div class="space-y-3">
            <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Imprint
            </h1>
            <p class="text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
              Legal notice, operator details, and direct contact options for Codex Hackathons.
            </p>
            <div class="flex flex-wrap items-center gap-3 text-[13px] text-neutral-600 dark:text-[#A3A3A3]">
              <span>Last updated {{ platformLegalLastUpdatedLabel }}</span>
              <span class="hidden sm:inline">•</span>
              <a
                :href="`mailto:${platformSupportEmail}`"
                class="transition-colors hover:text-highlighted dark:hover:text-white"
              >
                {{ platformSupportEmail }}
              </a>
              <span class="hidden sm:inline">•</span>
              <a
                :href="`mailto:${platformPrivacyEmail}`"
                class="transition-colors hover:text-highlighted dark:hover:text-white"
              >
                {{ platformPrivacyEmail }}
              </a>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="relative z-10 grid max-w-[68rem] gap-6 pb-10 pt-6 sm:pb-14 lg:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
      <section class="rounded-xl border border-black/8 bg-[#F7F7F8]/80 p-6 dark:border-white/[0.08] dark:bg-[#111111]/80">
        <div
          class="hackathon-markdown"
          v-html="imprintHtml"
        />
      </section>

      <section class="rounded-xl border border-black/8 bg-white/88 p-6 dark:border-white/[0.08] dark:bg-[#111111]/92">
        <div class="space-y-4">
          <div class="space-y-2">
            <h2 class="text-lg font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
              Contact us
            </h2>
            <p class="text-sm text-neutral-700 dark:text-[#A3A3A3]">
              Use this form for legal, support, and general platform questions. By sending a message, you agree that we may use it to respond as described in the Privacy Policy.
            </p>
          </div>

          <form
            class="space-y-4"
            @submit.prevent="submitContactForm"
          >
            <AppFormField
              name="imprint-contact-name"
              label="Name"
            >
              <input
                id="imprint-contact-name"
                v-model="contactForm.name"
                type="text"
                required
                maxlength="120"
                autocomplete="name"
                class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-highlighted dark:border-white/[0.08] dark:bg-[#181818] dark:text-white"
              >
            </AppFormField>

            <AppFormField
              name="imprint-contact-email"
              label="Email"
            >
              <input
                id="imprint-contact-email"
                v-model="contactForm.email"
                type="email"
                required
                autocomplete="email"
                class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-highlighted dark:border-white/[0.08] dark:bg-[#181818] dark:text-white"
              >
            </AppFormField>

            <div
              aria-hidden="true"
              class="absolute left-[-9999px] top-auto h-px w-px overflow-hidden"
            >
              <label for="imprint-contact-website">Website</label>
              <input
                id="imprint-contact-website"
                v-model="contactForm.website"
                type="text"
                tabindex="-1"
                autocomplete="off"
              >
            </div>

            <AppFormField
              name="imprint-contact-message"
              label="Message"
            >
              <textarea
                id="imprint-contact-message"
                v-model="contactForm.message"
                required
                maxlength="4000"
                rows="7"
                class="w-full rounded-xl border border-black/10 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-highlighted dark:border-white/[0.08] dark:bg-[#181818] dark:text-white"
              />
            </AppFormField>

            <div class="space-y-2">
              <p
                v-if="contactState.success"
                class="text-sm font-medium text-emerald-700 dark:text-emerald-400"
              >
                {{ contactState.success }}
              </p>
              <p
                v-if="contactState.error"
                class="text-sm font-medium text-red-700 dark:text-red-400"
              >
                {{ contactState.error }}
              </p>
            </div>

            <div class="flex items-center justify-between gap-4">
              <p class="text-xs text-neutral-600 dark:text-[#A3A3A3]">
                You can also write directly to
                <a
                  :href="`mailto:${platformSupportEmail}`"
                  class="transition-colors hover:text-highlighted dark:hover:text-white"
                >
                  {{ platformSupportEmail }}
                </a>.
              </p>

              <button
                type="submit"
                :disabled="contactState.pending"
                class="inline-flex items-center justify-center rounded-xl bg-highlighted px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {{ contactState.pending ? 'Sending...' : 'Send message' }}
              </button>
            </div>
          </form>
        </div>
      </section>
    </AppContainer>
  </div>
</template>
