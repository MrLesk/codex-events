<script setup lang="ts">
import PlatformAccountProfileForm from '~/components/account/PlatformAccountProfileForm.vue'
import { buildAccountOnboardingHref, buildTermsOnboardingHref } from '~/utils/auth-navigation'
import { requireAuthNavigationGuard } from '~/utils/auth-guards'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

const { actor, status, refresh } = await useAccountLifecycleActor()

if (actor.value && !actor.value.hasPlatformAccount) {
  await navigateTo(buildTermsOnboardingHref('/account'))
}

if (actor.value?.kind === 'platform_user' && actor.value.onboardingState === 'profile_pending') {
  await navigateTo(buildAccountOnboardingHref('/account'))
}

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
  success: '',
  error: ''
})

const deletionState = reactive({
  confirmationText: '',
  pending: false,
  error: ''
})

watch(
  actor,
  (nextActor) => {
    if (!nextActor?.hasPlatformAccount) {
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

const profileRows = computed(() => {
  if (!actor.value?.hasPlatformAccount) {
    return []
  }

  return [
    {
      label: 'Platform email',
      value: actor.value.platformUser.email
    },
    {
      label: 'Auth0 subject',
      value: actor.value.sessionUser.sub
    },
    {
      label: 'Platform roles',
      value: actor.value.isPlatformAdmin
        ? 'Platform admin'
        : actor.value.hackathonRoles.length > 0
          ? actor.value.hackathonRoles.map(role => role.role).join(', ')
          : 'No special platform roles'
    }
  ]
})

const flashMessage = computed(() => {
  if (saveState.success) {
    return saveState.success
  }

  return ''
})

async function saveProfile() {
  saveState.pending = true
  saveState.error = ''
  saveState.success = ''

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
    saveState.success = 'Profile saved.'
  } catch (error) {
    saveState.error = error instanceof Error
      ? error.message
      : 'Unable to save the profile.'
  } finally {
    saveState.pending = false
  }
}

async function deleteAccount() {
  deletionState.error = ''

  if (deletionState.confirmationText !== 'delete my account') {
    deletionState.error = 'Type "delete my account" exactly to confirm deletion.'
    return
  }

  deletionState.pending = true

  try {
    await $fetch('/api/account', {
      method: 'DELETE'
    })

    await refresh()
    await navigateTo(`${buildTermsOnboardingHref('/account')}&deleted=1`)
  } catch (error) {
    deletionState.error = error instanceof Error
      ? error.message
      : 'Unable to delete the platform account.'
  } finally {
    deletionState.pending = false
  }
}
</script>

<template>
  <AppContainer class="py-12">
    <PageSection
      title="Account settings"
      description="Manage the platform profile fields that influence application eligibility and keep the account ready for future hackathons."
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
                Platform account
              </AppBadge>
              <p class="text-xl font-semibold text-highlighted">
                Current identity and access summary
              </p>
            </div>
          </template>

          <AppAlert
            v-if="flashMessage"
            color="success"
            variant="subtle"
            :description="flashMessage"
            class="mb-4"
          />

          <dl class="grid gap-4">
            <div
              v-for="row in profileRows"
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

        <div class="space-y-6">
          <AppCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
            <template #header>
              <div class="space-y-2">
                <p class="text-lg font-semibold text-highlighted">
                  Profile fields used by hackathon applications
                </p>
                <p class="text-sm text-muted">
                  Keep the profile fields current so registration checks can validate the required profile fields for each hackathon.
                </p>
              </div>
            </template>

            <PlatformAccountProfileForm
              v-model="profileForm"
              :pending="saveState.pending"
              :error="saveState.error"
              submit-label="Save profile"
              @submit="saveProfile"
            />
          </AppCard>

          <AppCard class="rounded-[2rem] border border-error/30 bg-error/5 shadow-xl shadow-error/5">
            <template #header>
              <div class="space-y-2">
                <AppBadge
                  color="error"
                  variant="subtle"
                >
                  Danger zone
                </AppBadge>
                <p class="text-lg font-semibold text-highlighted">
                  Delete platform account
                </p>
                <p class="text-sm text-muted">
                  This keeps the Auth0 identity signed in, but removes the platform-side user record, role assignments, and platform document acceptance records.
                </p>
              </div>
            </template>

            <div class="space-y-4">
              <div class="space-y-2">
                <label
                  class="text-sm font-medium text-highlighted"
                  for="account-delete-confirmation"
                >
                  Type “delete my account” to confirm
                </label>
                <input
                  id="account-delete-confirmation"
                  v-model="deletionState.confirmationText"
                  type="text"
                  class="w-full rounded-2xl border border-error/30 bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-error"
                >
              </div>

              <AppAlert
                v-if="deletionState.error"
                color="error"
                variant="subtle"
                :description="deletionState.error"
              />

              <div class="flex items-center justify-between gap-4">
                <p class="max-w-md text-sm text-muted">
                  After deletion the next dashboard visit returns to the app-owned registration flow because the Auth0 session remains valid while the platform account is gone.
                </p>

                <AppButton
                  color="error"
                  variant="solid"
                  label="Delete account"
                  :loading="deletionState.pending"
                  @click="deleteAccount"
                />
              </div>
            </div>
          </AppCard>
        </div>
      </div>
    </PageSection>
  </AppContainer>
</template>
