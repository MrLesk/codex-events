<script setup lang="ts">
import PlatformAccountProfileForm from '~/components/account/PlatformAccountProfileForm.vue'
import {
  buildAuthLoginHref,
  buildTermsOnboardingHref,
  normalizeAuthReturnTo
} from '~/utils/auth-navigation'

const route = useRoute()
const user = useUser()
const { actor, status, refresh } = await useAccountLifecycleActor()

const requestedReturnTo = computed(() => normalizeAuthReturnTo(
  typeof route.query.returnTo === 'string' ? route.query.returnTo : null,
  '/dashboard'
))
const postOnboardingDestination = computed(() => {
  if (requestedReturnTo.value.startsWith('/auth/') || requestedReturnTo.value.startsWith('/onboarding/')) {
    return '/dashboard'
  }

  return requestedReturnTo.value
})

const profileForm = reactive({
  displayName: '',
  xProfileUrl: '',
  linkedinProfileUrl: '',
  githubProfileUrl: '',
  chatgptEmail: '',
  openaiOrgId: '',
  lumaUsername: ''
})

const saveState = reactive({
  pending: false,
  error: ''
})

watch(
  actor,
  (nextActor) => {
    if (nextActor?.kind !== 'platform_user') {
      return
    }

    profileForm.displayName = nextActor.platformUser.displayName
    profileForm.xProfileUrl = nextActor.platformUser.xProfileUrl ?? ''
    profileForm.linkedinProfileUrl = nextActor.platformUser.linkedinProfileUrl ?? ''
    profileForm.githubProfileUrl = nextActor.platformUser.githubProfileUrl ?? ''
    profileForm.chatgptEmail = nextActor.platformUser.chatgptEmail ?? ''
    profileForm.openaiOrgId = nextActor.platformUser.openaiOrgId ?? ''
    profileForm.lumaUsername = nextActor.platformUser.lumaUsername ?? ''
  },
  { immediate: true }
)

watchEffect(async () => {
  if (status.value === 'pending') {
    return
  }

  if (!user.value?.sub) {
    await navigateTo(buildAuthLoginHref(route.fullPath), { external: true })
    return
  }

  if (!actor.value?.hasPlatformAccount) {
    await navigateTo(buildTermsOnboardingHref(postOnboardingDestination.value))
    return
  }

  if (actor.value.kind === 'platform_user' && actor.value.onboardingState === 'completed') {
    await navigateTo(postOnboardingDestination.value)
  }
})

const identityRows = computed(() => {
  if (actor.value?.kind !== 'platform_user') {
    return []
  }

  return [{
    label: 'Platform email',
    value: actor.value.platformUser.email
  }, {
    label: 'Next destination',
    value: postOnboardingDestination.value
  }, {
    label: 'Workspace unlock',
    value: 'Hackathons, teams, submissions, and role-specific workspaces'
  }]
})

async function saveProfile() {
  saveState.pending = true
  saveState.error = ''

  try {
    await $fetch('/api/account', {
      method: 'PATCH',
      body: {
        displayName: profileForm.displayName,
        xProfileUrl: profileForm.xProfileUrl,
        linkedinProfileUrl: profileForm.linkedinProfileUrl,
        githubProfileUrl: profileForm.githubProfileUrl,
        chatgptEmail: profileForm.chatgptEmail,
        openaiOrgId: profileForm.openaiOrgId,
        lumaUsername: profileForm.lumaUsername
      }
    })

    await refresh()

    if (user.value?.sub) {
      await Promise.all([
        refreshNuxtData(`session-actor:${user.value.sub}`),
        refreshNuxtData(`shell-prize-redemptions-${user.value.sub}`)
      ])
    }

    await navigateTo(postOnboardingDestination.value)
  } catch (error) {
    saveState.error = error instanceof Error
      ? error.message
      : 'Unable to save the onboarding profile.'
  } finally {
    saveState.pending = false
  }
}

useSeoMeta({
  title: 'Complete Your Profile | Codex Hackathons',
  description: 'Finish platform onboarding by confirming the profile fields used by hackathon applications.'
})
</script>

<template>
  <AppContainer class="py-12">
    <PageSection
      title="Complete your profile"
      description="The platform account exists and the current platform documents were accepted. Confirm the profile fields used by hackathon application eligibility before entering the workspace."
    >
      <div
        v-if="status === 'pending'"
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <div class="h-64 rounded-[2rem] border border-default bg-elevated/70" />
        <div class="h-64 rounded-[2rem] border border-default bg-elevated/70" />
      </div>

      <div
        v-else
        class="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <AppCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <AppBadge
                color="primary"
                variant="subtle"
              >
                Onboarding step 2 of 2
              </AppBadge>
              <p class="text-xl font-semibold text-highlighted">
                Review the current profile baseline
              </p>
              <p class="text-sm text-muted">
                This page mirrors account settings so the first saved profile becomes the ongoing platform profile for future hackathons.
              </p>
            </div>
          </template>

          <dl class="grid gap-4">
            <div
              v-for="row in identityRows"
              :key="row.label"
              class="app-inset-choice p-4"
            >
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {{ row.label }}
              </dt>
              <dd class="mt-2 break-all text-sm text-toned">
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </AppCard>

        <AppCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <p class="text-lg font-semibold text-highlighted">
                Profile fields used by hackathon applications
              </p>
              <p class="text-sm text-muted">
                Save once to complete onboarding. You can edit the same fields later from account settings.
              </p>
            </div>
          </template>

          <PlatformAccountProfileForm
            v-model="profileForm"
            :pending="saveState.pending"
            :error="saveState.error"
            submit-label="Finish onboarding"
            footer-message="Complete this step with the profile values you want the platform to use for hackathon eligibility checks. Empty fields stay optional unless a hackathon requires them later."
            @submit="saveProfile"
          />
        </AppCard>
      </div>
    </PageSection>
  </AppContainer>
</template>
