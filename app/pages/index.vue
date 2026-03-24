<script setup lang="ts">
import DashboardEntryCard from '~/components/shell/DashboardEntryCard.vue'

const { actor, dashboardEntries, loginHref } = useShellNavigation()

const primaryLinks = computed(() => {
  if (actor.value.kind === 'anonymous') {
    return [{
      label: 'Browse hackathons',
      to: '/hackathons',
      trailingIcon: 'i-lucide-arrow-right',
      size: 'xl' as const
    }, {
      label: 'Sign in with Auth0',
      to: loginHref.value,
      external: true,
      size: 'xl' as const,
      color: 'neutral' as const,
      variant: 'subtle' as const
    }]
  }

  return [{
    label: 'Open dashboard',
    to: '/dashboard',
    trailingIcon: 'i-lucide-arrow-right',
    size: 'xl' as const
  }, {
    label: actor.value.kind === 'authenticated_identity' ? 'Continue onboarding' : 'Open hackathons',
    to: actor.value.kind === 'authenticated_identity' ? '/dashboard' : '/hackathons',
    size: 'xl' as const,
    color: 'neutral' as const,
    variant: 'subtle' as const
  }]
})
</script>

<template>
  <div class="space-y-14 pb-20">
    <UPageHero
      title="Operate hackathons through one role-aware surface instead of scattered workflows."
      description="The shell now separates public discovery from authenticated workspaces. Public visitors can inspect visible hackathons, while signed-in users enter a dashboard that reflects their real platform actor and effective hackathon roles."
      :links="primaryLinks"
      orientation="horizontal"
    >
      <template #headline>
        <UBadge
          color="primary"
          variant="soft"
          class="rounded-full px-4 py-1.5 font-semibold tracking-[0.18em] uppercase"
        >
          {{
            actor.kind === 'anonymous'
              ? 'Public shell'
              : actor.kind === 'authenticated_identity'
                ? 'Authenticated identity'
                : 'Platform workspace'
          }}
        </UBadge>
      </template>

      <template #body>
        <div class="grid gap-4 sm:grid-cols-3">
          <UCard
            variant="subtle"
            :ui="{ root: 'rounded-[1.75rem] border border-default/80 bg-elevated/80 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)] backdrop-blur' }"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Public
            </p>
            <p class="mt-3 text-lg font-semibold text-highlighted">
              Discovery stays open
            </p>
            <p class="mt-2 text-sm leading-7 text-toned">
              Anyone can inspect visible hackathons, lifecycle timing, criteria, prizes, and terms references.
            </p>
          </UCard>

          <UCard
            variant="subtle"
            :ui="{ root: 'rounded-[1.75rem] border border-default/80 bg-elevated/80 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)] backdrop-blur' }"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Authenticated
            </p>
            <p class="mt-3 text-lg font-semibold text-highlighted">
              Actor-aware entry
            </p>
            <p class="mt-2 text-sm leading-7 text-toned">
              The dashboard branches on canonical actor resolution, not on Auth0 profile assumptions or template shortcuts.
            </p>
          </UCard>

          <UCard
            variant="subtle"
            :ui="{ root: 'rounded-[1.75rem] border border-default/80 bg-elevated/80 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)] backdrop-blur' }"
          >
            <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
              Role-aware
            </p>
            <p class="mt-3 text-lg font-semibold text-highlighted">
              One shell, multiple surfaces
            </p>
            <p class="mt-2 text-sm leading-7 text-toned">
              Participants, judges, admins, and prize recipients see only the entry points that match their effective product permissions.
            </p>
          </UCard>
        </div>
      </template>
    </UPageHero>

    <UPageSection
      title="What the shell enforces"
      description="Each area below exists to keep public, participant, judge, admin, and winner-facing flows legible before deeper feature pages fill in."
      :features="[{
        icon: 'i-lucide-shield-check',
        title: 'Authorization comes from platform data',
        description: 'The shell consumes the canonical session actor so role-aware entry points reflect platform-account state and hackathon assignments.'
      }, {
        icon: 'i-lucide-log-in',
        title: 'Public and authenticated surfaces stay distinct',
        description: 'Signed-out visitors stay in public discovery, while authenticated users route into the dashboard without exposing restricted workflows in the landing surface.'
      }, {
        icon: 'i-lucide-layout-dashboard',
        title: 'Shared entry points stay thin',
        description: 'The shell exposes stable routes for judges and winners without stealing deep implementation from the dedicated tasks that follow.'
      }]"
    >
      <template #body>
        <div class="grid gap-6 xl:grid-cols-3">
          <DashboardEntryCard
            v-for="entry in dashboardEntries"
            :key="entry.id"
            :entry="entry"
          />
        </div>
      </template>
    </UPageSection>
  </div>
</template>
