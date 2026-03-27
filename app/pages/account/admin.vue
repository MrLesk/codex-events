<script setup lang="ts">
import {
  canCreateHackathon,
  formatHackathonState,
  getHackathonStateColor
} from '~/utils/admin-workspace'
import { collapseMarkdownToPlainText } from '~/utils/hackathon-description'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const workspace = useAdminWorkspace()

const actor = computed(() => workspace.actor.value)
const manageableHackathons = computed(() => workspace.manageableHackathons.value)
const canCreate = computed(() => canCreateHackathon(actor.value))

const isLoading = computed(() =>
  workspace.session.status.value === 'pending' || workspace.hackathons.status.value === 'pending'
)
const hasPlatformAccount = computed(() => Boolean(actor.value?.hasPlatformAccount))
const hasAdminAccess = computed(() =>
  Boolean(
    actor.value?.hasPlatformAccount
    && (actor.value.isPlatformAdmin || actor.value.hackathonRoles.some(role => role.role === 'hackathon_admin'))
  )
)
const scopeLabel = computed(() => {
  if (!actor.value?.hasPlatformAccount) {
    return 'Not available'
  }

  return actor.value.isPlatformAdmin ? 'Platform admin' : 'Hackathon admin'
})
const draftCount = computed(() =>
  manageableHackathons.value.filter(hackathon => hackathon.state === 'draft').length
)
const activeOperationsCount = computed(() =>
  manageableHackathons.value.filter(hackathon => hackathon.state !== 'draft' && hackathon.state !== 'completed').length
)
const descriptionPreviewCharacterLimit = 320
const expandedDescriptionHackathonIds = ref(new Set<string>())
const normalizedDescriptionByHackathonId = computed(() => {
  const descriptionMap = new Map<string, string>()

  for (const hackathon of manageableHackathons.value) {
    descriptionMap.set(hackathon.id, collapseMarkdownToPlainText(hackathon.description))
  }

  return descriptionMap
})

function isDescriptionExpanded(hackathonId: string) {
  return expandedDescriptionHackathonIds.value.has(hackathonId)
}

function toggleDescriptionExpansion(hackathonId: string) {
  const nextExpandedIds = new Set(expandedDescriptionHackathonIds.value)

  if (nextExpandedIds.has(hackathonId)) {
    nextExpandedIds.delete(hackathonId)
  } else {
    nextExpandedIds.add(hackathonId)
  }

  expandedDescriptionHackathonIds.value = nextExpandedIds
}

function getDescriptionPreview(hackathonId: string) {
  const normalizedDescription = normalizedDescriptionByHackathonId.value.get(hackathonId) ?? ''

  if (
    isDescriptionExpanded(hackathonId)
    || normalizedDescription.length <= descriptionPreviewCharacterLimit
  ) {
    return normalizedDescription
  }

  return `${normalizedDescription.slice(0, descriptionPreviewCharacterLimit).trimEnd()}…`
}

function shouldShowDescriptionToggle(hackathonId: string) {
  const normalizedDescription = normalizedDescriptionByHackathonId.value.get(hackathonId) ?? ''
  return normalizedDescription.length > descriptionPreviewCharacterLimit
}

useSeoMeta({
  title: 'Admin Workspace | Codex Hackathons',
  description: 'Manage hackathons and run admin operations from your account workspace.'
})
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-2 pb-4">
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div class="space-y-2">
              <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                Account workspace
              </p>
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                Admin
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                Access the hackathons you can manage and jump directly into setup, operations, or competition control.
              </p>
            </div>

            <div class="rounded-lg border border-black/8 bg-[#F7F7F8] px-4 py-2 dark:border-white/[0.08] dark:bg-[#171717]">
              <p class="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                Scope
              </p>
              <p class="mt-1 text-[14px] font-medium text-highlighted dark:text-white">
                {{ scopeLabel }}
              </p>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-6 pt-6">
      <AppAlert
        v-if="workspace.session.error.value"
        color="error"
        variant="soft"
        title="Unable to load admin workspace"
        :description="workspace.session.error.value.message"
      />

      <AppAlert
        v-else-if="workspace.hackathons.error.value"
        color="error"
        variant="soft"
        title="Unable to load hackathons"
        :description="workspace.hackathons.error.value.message"
      />

      <AppAlert
        v-else-if="isLoading"
        color="neutral"
        variant="soft"
        title="Loading admin workspace"
        description="This only takes a moment."
      />

      <AppAlert
        v-else-if="!hasPlatformAccount"
        color="warning"
        variant="soft"
        title="Platform account required"
        description="Admin operations are available after the authenticated session is linked to a platform account."
      />

      <AppAlert
        v-else-if="!hasAdminAccess"
        color="warning"
        variant="soft"
        title="Admin access required"
        description="This account does not currently have platform-admin or hackathon-admin permissions."
      />

      <template v-else>
        <section class="grid gap-4 sm:grid-cols-3">
          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Manageable hackathons
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ manageableHackathons.length }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Active operations
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ activeOperationsCount }}
            </p>
          </div>

          <div class="rounded-xl border border-black/8 bg-white p-4 dark:border-white/[0.08] dark:bg-[#111111]">
            <p class="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
              Drafts to configure
            </p>
            <p class="mt-2 text-[30px] font-semibold leading-none tracking-[-0.03em] text-highlighted dark:text-white">
              {{ draftCount }}
            </p>
          </div>
        </section>

        <div
          v-if="canCreate"
          class="flex justify-end"
        >
          <AppButton
            to="/admin/hackathons/new"
            color="neutral"
            variant="solid"
            class="h-auto rounded-lg bg-black px-4 py-2 text-[13px] font-medium text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-[#ECECEC]"
          >
            Create hackathon
            <template #trailing>
              <AppIcon
                name="i-lucide-plus"
                class="size-3.5"
              />
            </template>
          </AppButton>
        </div>

        <section class="space-y-4">
          <div class="border-b border-black/8 pb-3 dark:border-white/[0.08]">
            <p class="text-[20px] font-medium text-highlighted dark:text-white">
              Hackathons you can operate
            </p>
          </div>

          <div
            v-if="manageableHackathons.length === 0"
            class="rounded-xl border border-dashed border-black/10 bg-white p-8 text-center dark:border-white/[0.08] dark:bg-[#111111]"
          >
            <p class="text-[15px] font-medium text-highlighted dark:text-white">
              No manageable hackathons yet
            </p>
            <p class="mt-2 text-[14px] text-neutral-500 dark:text-[#A3A3A3]">
              Once you receive admin access, hackathons will appear here.
            </p>
          </div>

          <div
            v-else
            class="grid gap-4"
          >
            <NuxtLink
              v-for="hackathon in manageableHackathons"
              :key="hackathon.id"
              :to="`/account/hackathons/${hackathon.slug}/admin`"
              class="rounded-xl border border-black/8 bg-white p-5 transition-colors hover:border-black/20 dark:border-white/[0.08] dark:bg-[#111111] dark:hover:border-white/[0.2]"
            >
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="text-[18px] font-semibold text-highlighted dark:text-white">
                      {{ hackathon.name }}
                    </p>
                    <AppBadge
                      :color="getHackathonStateColor(hackathon.state)"
                      variant="soft"
                      class="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                    >
                      {{ formatHackathonState(hackathon.state) }}
                    </AppBadge>
                  </div>
                  <p class="max-w-3xl break-words text-[14px] text-neutral-600 dark:text-[#B0B0B0]">
                    {{ getDescriptionPreview(hackathon.id) }}
                  </p>
                  <button
                    v-if="shouldShowDescriptionToggle(hackathon.id)"
                    type="button"
                    class="inline-flex text-[13px] font-medium text-highlighted transition-colors hover:text-neutral-700 dark:text-white dark:hover:text-[#D9D9D9]"
                    @click.stop.prevent="toggleDescriptionExpansion(hackathon.id)"
                  >
                    {{ isDescriptionExpanded(hackathon.id) ? 'Show less' : 'Load more' }}
                  </button>
                  <div class="flex flex-wrap items-center gap-3 text-[12px] text-muted">
                    <span>{{ hackathon.city }}</span>
                    <span>{{ hackathon.maxTeamMembers }} max/team</span>
                    <span>{{ hackathon.slug }}</span>
                  </div>
                </div>

                <div class="inline-flex items-center gap-1 text-[13px] font-medium text-highlighted dark:text-white">
                  <span>Open</span>
                  <AppIcon
                    name="i-lucide-arrow-right"
                    class="size-3.5"
                  />
                </div>
              </div>
            </NuxtLink>
          </div>
        </section>
      </template>
    </AppContainer>
  </div>
</template>
