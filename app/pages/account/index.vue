<script setup lang="ts">
import { requireAuthNavigationGuard } from '~/utils/auth-guards'

definePageMeta({
  middleware: [requireAuthNavigationGuard]
})

const route = useRoute()
const { actor, status, refresh } = await useAccountLifecycleActor()

if (actor.value && !actor.value.hasPlatformAccount) {
  await navigateTo('/onboarding/account')
}

const profileForm = reactive({
  displayName: '',
  xProfileUrl: '',
  linkedinProfileUrl: '',
  githubProfileUrl: ''
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

  if (route.query.created === '1') {
    return 'Platform account created. You can now complete your profile and join hackathons.'
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
        githubProfileUrl: profileForm.githubProfileUrl
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
    await navigateTo('/onboarding/account?deleted=1')
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
  <UContainer class="py-12">
    <UPageSection
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
        <UCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
          <template #header>
            <div class="space-y-2">
              <UBadge
                color="primary"
                variant="subtle"
              >
                Platform account
              </UBadge>
              <p class="text-xl font-semibold text-highlighted">
                Current identity and access summary
              </p>
            </div>
          </template>

          <UAlert
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
              class="rounded-2xl border border-default/70 bg-muted/40 p-4"
            >
              <dt class="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                {{ row.label }}
              </dt>
              <dd class="mt-2 break-all text-sm text-toned">
                {{ row.value }}
              </dd>
            </div>
          </dl>
        </UCard>

        <div class="space-y-6">
          <UCard class="rounded-[2rem] border border-default/80 bg-elevated/90 shadow-xl shadow-primary/5">
            <template #header>
              <div class="space-y-2">
                <p class="text-lg font-semibold text-highlighted">
                  Profile fields used by hackathon applications
                </p>
                <p class="text-sm text-muted">
                  Keep the social links current so registration checks can validate the required profile fields for each hackathon.
                </p>
              </div>
            </template>

            <form
              class="space-y-5"
              @submit.prevent="saveProfile"
            >
              <div class="space-y-2">
                <label
                  class="text-sm font-medium text-highlighted"
                  for="account-display-name"
                >
                  Display name
                </label>
                <input
                  id="account-display-name"
                  v-model="profileForm.displayName"
                  type="text"
                  required
                  class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
                >
              </div>

              <div class="grid gap-4 md:grid-cols-2">
                <div class="space-y-2">
                  <label
                    class="text-sm font-medium text-highlighted"
                    for="account-github-profile-url"
                  >
                    GitHub profile URL
                  </label>
                  <input
                    id="account-github-profile-url"
                    v-model="profileForm.githubProfileUrl"
                    type="url"
                    placeholder="https://github.com/your-name"
                    class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
                  >
                </div>

                <div class="space-y-2">
                  <label
                    class="text-sm font-medium text-highlighted"
                    for="account-linkedin-profile-url"
                  >
                    LinkedIn profile URL
                  </label>
                  <input
                    id="account-linkedin-profile-url"
                    v-model="profileForm.linkedinProfileUrl"
                    type="url"
                    placeholder="https://linkedin.com/in/your-name"
                    class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
                  >
                </div>
              </div>

              <div class="space-y-2">
                <label
                  class="text-sm font-medium text-highlighted"
                  for="account-x-profile-url"
                >
                  X profile URL
                </label>
                <input
                  id="account-x-profile-url"
                  v-model="profileForm.xProfileUrl"
                  type="url"
                  placeholder="https://x.com/your-name"
                  class="w-full rounded-2xl border border-default bg-elevated px-4 py-3 text-sm text-toned outline-none transition focus:border-primary"
                >
              </div>

              <UAlert
                v-if="saveState.error"
                color="error"
                variant="subtle"
                :description="saveState.error"
              />

              <div class="flex items-center justify-between gap-4">
                <p class="max-w-md text-sm text-muted">
                  Empty fields are stored as absent values, which means hackathons that require a specific profile link will block application submission until you add it.
                </p>

                <UButton
                  type="submit"
                  label="Save profile"
                  :loading="saveState.pending"
                  size="lg"
                />
              </div>
            </form>
          </UCard>

          <UCard class="rounded-[2rem] border border-error/30 bg-error/5 shadow-xl shadow-error/5">
            <template #header>
              <div class="space-y-2">
                <UBadge
                  color="error"
                  variant="subtle"
                >
                  Danger zone
                </UBadge>
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

              <UAlert
                v-if="deletionState.error"
                color="error"
                variant="subtle"
                :description="deletionState.error"
              />

              <div class="flex items-center justify-between gap-4">
                <p class="max-w-md text-sm text-muted">
                  After deletion the next dashboard visit will move back into the onboarding state because the Auth0 session remains valid while the platform account is gone.
                </p>

                <UButton
                  color="error"
                  variant="solid"
                  label="Delete account"
                  :loading="deletionState.pending"
                  @click="deleteAccount"
                />
              </div>
            </div>
          </UCard>
        </div>
      </div>
    </UPageSection>
  </UContainer>
</template>
