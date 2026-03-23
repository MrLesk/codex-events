<script setup lang="ts">
import {
  canCreateHackathon,
  formatHackathonState,
  getHackathonStateColor
} from '~/utils/admin-workspace'

definePageMeta({
  middleware: [to => useUser().value
    ? undefined
    : navigateTo(`/auth/login?returnTo=${encodeURIComponent(to.fullPath)}`)]
})

const workspace = useAdminWorkspace()

const adminReady = computed(() => workspace.session.status.value !== 'pending' && workspace.hackathons.status.value !== 'pending')
const actor = computed(() => workspace.actor.value)
const manageableHackathons = computed(() => workspace.manageableHackathons.value)
const canCreate = computed(() => canCreateHackathon(actor.value))
</script>

<template>
  <UContainer class="space-y-8 py-10 sm:py-14">
    <AdminWorkspaceHeader
      eyebrow="Admin Workspace"
      title="Operate hackathons through the canonical control room."
      description="This route is reserved for platform admins and hackathon admins. It exposes only the hackathons and setup controls the current actor can legitimately manage."
    />

    <UAlert
      v-if="workspace.session.error.value"
      color="error"
      variant="soft"
      title="Unable to load session"
      :description="workspace.session.error.value.message"
    />

    <template v-else-if="adminReady">
      <UAlert
        v-if="!actor?.hasPlatformAccount"
        color="warning"
        variant="soft"
        title="Platform account required"
        description="Admin controls require a platform account linked to the authenticated session."
      />

      <UAlert
        v-else-if="manageableHackathons.length === 0 && !canCreate"
        color="warning"
        variant="soft"
        title="No admin access found"
        description="This session is authenticated, but it does not currently have platform-admin or hackathon-admin capabilities for any hackathon."
      />

      <section
        v-else
        class="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"
      >
        <UCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Capability Snapshot
              </h2>
              <p class="text-sm text-muted">
                Actor capabilities come from platform data, not Auth0 roles.
              </p>
            </div>
          </template>

          <div class="grid gap-4 text-sm">
            <div class="rounded-2xl border border-default bg-default px-4 py-3">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Signed in as
              </p>
              <p class="mt-2 text-base font-semibold text-highlighted">
                {{ actor?.platformUser?.displayName ?? actor?.sessionUser?.email ?? 'Unknown user' }}
              </p>
              <p class="mt-1 text-muted">
                {{ actor?.platformUser?.email ?? actor?.sessionUser?.email ?? 'No email available' }}
              </p>
            </div>

            <div class="rounded-2xl border border-default bg-default px-4 py-3">
              <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                Effective admin scope
              </p>
              <p class="mt-2 text-base font-semibold text-highlighted">
                {{ actor?.isPlatformAdmin ? 'Platform admin' : 'Hackathon admin' }}
              </p>
              <p class="mt-1 text-muted">
                {{ actor?.isPlatformAdmin ? 'Full hackathon creation and role-management authority.' : `${manageableHackathons.length} manageable hackathon${manageableHackathons.length === 1 ? '' : 's'} available.` }}
              </p>
            </div>

            <UButton
              v-if="canCreate"
              to="/admin/hackathons/new"
              size="lg"
              color="primary"
              icon="i-lucide-plus"
              label="Create Hackathon"
            />
          </div>
        </UCard>

        <UCard class="border border-default/70 bg-elevated/90">
          <template #header>
            <div class="space-y-1">
              <h2 class="text-lg font-semibold text-highlighted">
                Manageable Hackathons
              </h2>
              <p class="text-sm text-muted">
                Draft hackathons appear only when the current actor is allowed to see them.
              </p>
            </div>
          </template>

          <div
            v-if="manageableHackathons.length > 0"
            class="grid gap-4"
          >
            <NuxtLink
              v-for="hackathon in manageableHackathons"
              :key="hackathon.id"
              :to="`/admin/hackathons/${hackathon.id}`"
              class="group rounded-[1.5rem] border border-default bg-default px-5 py-5 transition hover:border-primary/50 hover:bg-elevated"
            >
              <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div class="space-y-2">
                  <div class="flex flex-wrap items-center gap-3">
                    <h3 class="text-lg font-semibold text-highlighted">
                      {{ hackathon.name }}
                    </h3>
                    <UBadge
                      :color="getHackathonStateColor(hackathon.state)"
                      variant="soft"
                    >
                      {{ formatHackathonState(hackathon.state) }}
                    </UBadge>
                  </div>
                  <p class="max-w-2xl text-sm text-toned">
                    {{ hackathon.description }}
                  </p>
                  <div class="flex flex-wrap gap-4 text-xs uppercase tracking-[0.16em] text-muted">
                    <span>{{ hackathon.city }}</span>
                    <span>{{ hackathon.slug }}</span>
                    <span>{{ hackathon.maxTeamMembers }} max/team</span>
                  </div>
                </div>

                <div class="flex items-center gap-2 text-sm font-medium text-primary transition group-hover:translate-x-1">
                  <span>Open workspace</span>
                  <UIcon
                    name="i-lucide-arrow-right"
                    class="size-4"
                  />
                </div>
              </div>
            </NuxtLink>
          </div>

          <UAlert
            v-else
            color="neutral"
            variant="soft"
            title="No hackathons available"
            description="No manageable hackathons are currently visible to this actor."
          />
        </UCard>
      </section>
    </template>
  </UContainer>
</template>
