<script setup lang="ts">
import type { ApiListResponse } from '~/utils/admin-workspace'
import type {
  PublishedHackathonRosterMember,
  PublishedHackathonRosterRole
} from '~/utils/hackathon-published-roster'

import { getPublishedHackathonRosterLinks } from '~/utils/hackathon-published-roster'
import { buildProfileIconHref } from '~/utils/profile-icon'

const props = defineProps<{
  hackathonId: string
  role: PublishedHackathonRosterRole
  title: string
  description: string
}>()

const endpoint = computed(() => props.role === 'judge' ? 'judges' : 'staff')
const {
  data,
  error,
  status
} = useFetch<ApiListResponse<PublishedHackathonRosterMember>>(
  () => `/api/hackathons/${props.hackathonId}/${endpoint.value}`,
  {
    key: () => `account-hackathon-published-roster:${props.hackathonId}:${props.role}`,
    watch: [() => props.hackathonId, () => props.role]
  }
)

const members = computed(() => data.value?.data ?? [])
const emptyState = computed(() => props.role === 'judge'
  ? {
      title: 'No judges published yet',
      description: 'Assigned judges will appear here once the official judge roster is set for this hackathon.'
    }
  : {
      title: 'No staff published yet',
      description: 'Assigned staff will appear here once the official staff roster is set for this hackathon.'
    })
const loadingState = computed(() => props.role === 'judge'
  ? {
      title: 'Loading judges',
      description: 'Fetching the published judge roster for this hackathon.'
    }
  : {
      title: 'Loading staff',
      description: 'Fetching the published staff roster for this hackathon.'
    })
const errorState = computed(() => props.role === 'judge'
  ? {
      title: 'Judge roster unavailable'
    }
  : {
      title: 'Staff roster unavailable'
    })

function getMemberProfileIconHref(member: PublishedHackathonRosterMember) {
  return buildProfileIconHref(
    member.id,
    member.profileIconUpdatedAt,
    props.hackathonId
  )
}
</script>

<template>
  <AppCard class="rounded-xl hackathon-workspace-detail-panel">
    <template #header>
      <div class="space-y-1 border-b border-black/8 pb-5 dark:border-white/[0.08]">
        <h2 class="text-lg font-semibold text-highlighted">
          {{ props.title }}
        </h2>
        <p class="text-sm text-muted">
          {{ props.description }}
        </p>
      </div>
    </template>

    <div class="space-y-6">
      <AppAlert
        v-if="error"
        color="error"
        variant="soft"
        :title="errorState.title"
        :description="error.message"
      />

      <AppAlert
        v-else-if="status === 'pending'"
        color="neutral"
        variant="soft"
        :title="loadingState.title"
        :description="loadingState.description"
      />

      <AppAlert
        v-else-if="members.length === 0"
        color="neutral"
        variant="soft"
        :title="emptyState.title"
        :description="emptyState.description"
      />

      <div
        v-else
        class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
      >
        <article
          v-for="member in members"
          :key="member.id"
          class="hackathon-workspace-detail-inset flex h-full flex-col gap-4 rounded-xl p-5"
        >
          <div class="flex items-start gap-4">
            <AppAvatar
              size="3xl"
              :src="getMemberProfileIconHref(member)"
              :alt="member.fullName"
              class="shrink-0"
            />

            <div class="min-w-0 space-y-1">
              <h3 class="text-base font-semibold text-highlighted dark:text-white">
                {{ member.fullName }}
              </h3>

              <p
                v-if="member.company"
                class="text-sm text-muted"
              >
                {{ member.company }}
              </p>
            </div>
          </div>

          <p
            v-if="member.bio"
            class="text-sm leading-6 text-neutral-700 dark:text-[#C7C7C7]"
          >
            {{ member.bio }}
          </p>

          <div
            v-if="getPublishedHackathonRosterLinks(member).length > 0"
            class="mt-auto flex flex-wrap gap-2 pt-1"
          >
            <a
              v-for="link in getPublishedHackathonRosterLinks(member)"
              :key="link.key"
              :href="link.href"
              target="_blank"
              rel="noreferrer"
              class="inline-flex items-center gap-1 rounded-full border border-black/10 px-3 py-1 text-sm text-sky-700 transition hover:border-black/20 hover:text-sky-800 dark:border-white/[0.12] dark:text-sky-300 dark:hover:border-white/[0.22] dark:hover:text-sky-200"
            >
              {{ link.label }}
              <AppIcon
                name="i-lucide-external-link"
                class="size-3"
              />
            </a>
          </div>
        </article>
      </div>
    </div>
  </AppCard>
</template>
