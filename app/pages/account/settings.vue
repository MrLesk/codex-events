<script setup lang="ts">
import AccountSettingsProfileForm from '~/components/account/AccountSettingsProfileForm.vue'
import { accountDashboardHref, authLogoutHref } from '~/utils/auth-navigation'

definePageMeta({
  layout: 'profile',
  middleware: ['require-auth']
})

const user = useUser()
const { actor, status, refresh } = await useAccountLifecycleActor()

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

const profileIconState = reactive({
  uploadPending: false,
  removePending: false,
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

async function saveProfile() {
  const wasProfilePending = actor.value?.kind === 'platform_user'
    && actor.value.onboardingState === 'profile_pending'

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

    if (wasProfilePending) {
      await navigateTo(accountDashboardHref)
      return
    }

    saveState.success = 'Profile saved.'
  } catch (error) {
    saveState.error = error instanceof Error
      ? error.message
      : 'Unable to save the profile.'
  } finally {
    saveState.pending = false
  }
}

const profileIconSrc = computed(() => {
  if (actor.value?.kind !== 'platform_user') {
    return undefined
  }

  const version = actor.value.platformUser.profileIconUpdatedAt

  if (!version) {
    return undefined
  }

  return `/api/account/profile-icon?v=${encodeURIComponent(version)}`
})

const profileIconAlt = computed(() => {
  if (actor.value?.kind === 'platform_user') {
    return actor.value.platformUser.displayName
  }

  return user.value?.name ?? 'User'
})

async function uploadProfileIcon(event: Event) {
  const target = event.target as HTMLInputElement | null
  const file = target?.files?.item(0) ?? null

  if (!file) {
    return
  }

  profileIconState.uploadPending = true
  profileIconState.success = ''
  profileIconState.error = ''

  try {
    const formData = new FormData()
    formData.append('file', file)

    await $fetch('/api/account/profile-icon', {
      method: 'POST',
      body: formData
    })

    await refresh()
    profileIconState.success = 'Profile icon updated.'
  } catch (error) {
    profileIconState.error = error instanceof Error
      ? error.message
      : 'Unable to upload profile icon.'
  } finally {
    if (target) {
      target.value = ''
    }

    profileIconState.uploadPending = false
  }
}

async function removeProfileIcon() {
  profileIconState.removePending = true
  profileIconState.success = ''
  profileIconState.error = ''

  try {
    await $fetch('/api/account/profile-icon', {
      method: 'DELETE'
    })

    await refresh()
    profileIconState.success = 'Profile icon removed.'
  } catch (error) {
    profileIconState.error = error instanceof Error
      ? error.message
      : 'Unable to remove profile icon.'
  } finally {
    profileIconState.removePending = false
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
    await navigateTo(authLogoutHref, { external: true })
  } catch (error) {
    deletionState.error = error instanceof Error
      ? error.message
      : 'Unable to delete the platform account.'
  } finally {
    deletionState.pending = false
  }
}

const accountEmail = computed(() => {
  if (actor.value?.kind === 'platform_user') {
    return actor.value.platformUser.email
  }

  return user.value?.email ?? ''
})

const isProfileSetupMode = computed(() =>
  actor.value?.kind === 'platform_user' && actor.value.onboardingState === 'profile_pending'
)
const isPlatformAccountUnavailable = computed(() =>
  status.value !== 'pending' && actor.value?.kind !== 'platform_user'
)
const profileSubmitLabel = computed(() => isProfileSetupMode.value ? 'Finish setup' : 'Save changes')
</script>

<template>
  <div class="pb-14">
    <section class="border-b border-black/8 dark:border-white/[0.08]">
      <AppContainer class="max-w-[68rem] pb-0 pt-2 sm:pt-3">
        <div class="space-y-2 pb-4">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div class="space-y-2">
              <h1 class="text-[28px] font-semibold tracking-[-0.02em] text-highlighted dark:text-white">
                Account settings
              </h1>
              <p class="max-w-3xl text-[15px] text-neutral-700 dark:text-[#A3A3A3]">
                {{
                  isProfileSetupMode
                    ? 'Complete profile setup before entering the full workspace.'
                    : 'Update the profile details used across your hackathon participation and keep your account information current.'
                }}
              </p>
            </div>
            <div class="flex max-w-full items-center gap-2 rounded-lg border border-black/8 bg-[#F7F7F8] px-4 py-3 dark:border-white/[0.08] dark:bg-[#171717]">
              <AppIcon
                name="i-lucide-mail"
                class="size-4 text-dimmed"
              />
              <p class="text-[14px] font-medium text-highlighted dark:text-white">
                {{ accountEmail }}
              </p>
            </div>
          </div>
        </div>
      </AppContainer>
    </section>

    <AppContainer class="max-w-[68rem] space-y-8 pt-6">
      <div
        v-if="status === 'pending'"
        class="space-y-6"
      >
        <div class="h-64 rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]" />
        <div class="h-64 rounded-xl border border-black/8 bg-white dark:border-white/[0.08] dark:bg-[#111111]" />
      </div>

      <div
        v-else
        class="space-y-8"
      >
        <AppAlert
          v-if="isPlatformAccountUnavailable"
          color="warning"
          variant="subtle"
          title="Account provisioning is not complete"
          description="Sign out and repeat the Auth0 signup flow to provision your platform account."
        />

        <section class="space-y-5">
          <div
            v-if="!isPlatformAccountUnavailable"
            class="rounded-xl border border-default/70 bg-default/45 p-5"
          >
            <div class="mb-4 flex items-center gap-2">
              <AppIcon
                name="i-lucide-image"
                class="size-4 text-dimmed"
              />
              <p class="text-sm font-semibold text-highlighted">
                Profile icon
              </p>
            </div>

            <div class="flex flex-wrap items-center gap-4">
              <AppAvatar
                :src="profileIconSrc"
                :alt="profileIconAlt"
                size="3xl"
                fallback="icon"
              />

              <div class="space-y-3">
                <div class="flex flex-wrap gap-2">
                  <label class="cursor-pointer">
                    <input
                      class="sr-only"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      :disabled="profileIconState.uploadPending || profileIconState.removePending"
                      @change="uploadProfileIcon"
                    >
                    <AppButton
                      type="button"
                      :loading="profileIconState.uploadPending"
                      label="Upload icon"
                    />
                  </label>

                  <AppButton
                    variant="soft"
                    color="neutral"
                    label="Remove icon"
                    :disabled="!profileIconSrc || profileIconState.uploadPending"
                    :loading="profileIconState.removePending"
                    @click="removeProfileIcon"
                  />
                </div>
                <p class="text-xs text-muted">
                  Upload JPEG, PNG, or WebP up to 1MB.
                </p>
              </div>
            </div>
          </div>

          <AppAlert
            v-if="saveState.success"
            color="success"
            variant="subtle"
            :description="saveState.success"
          />

          <AppAlert
            v-if="profileIconState.success"
            color="success"
            variant="subtle"
            :description="profileIconState.success"
          />

          <AppAlert
            v-if="profileIconState.error"
            color="error"
            variant="subtle"
            :description="profileIconState.error"
          />

          <AccountSettingsProfileForm
            v-if="!isPlatformAccountUnavailable"
            v-model="profileForm"
            :pending="saveState.pending"
            :error="saveState.error"
            :submit-label="profileSubmitLabel"
            @submit="saveProfile"
          />
        </section>

        <section
          v-if="!isPlatformAccountUnavailable"
          class="space-y-5"
        >
          <div class="border-b border-error/20 pb-3">
            <p class="text-[20px] font-medium text-error">
              Danger zone
            </p>
          </div>

          <div class="rounded-xl border border-error/20 bg-error/5 p-6">
            <div class="space-y-5">
              <div class="space-y-2">
                <p class="text-sm font-semibold text-highlighted dark:text-white">
                  Delete platform account
                </p>
                <p class="text-sm text-muted">
                  This permanently removes your platform account record, role assignments, and platform document acceptance history.
                </p>
                <p class="text-sm text-muted">
                  You will be signed out after deletion. Signing in again starts a fresh account-provisioning flow.
                </p>
              </div>

              <div class="space-y-2">
                <label
                  class="text-sm font-medium text-highlighted dark:text-white"
                  for="account-delete-confirmation"
                >
                  Type "delete my account" to confirm
                </label>
                <input
                  id="account-delete-confirmation"
                  v-model="deletionState.confirmationText"
                  type="text"
                  class="w-full rounded-lg border border-error/30 bg-white px-3 py-2.5 text-sm text-toned outline-none transition focus:border-error dark:bg-[#111111]"
                >
              </div>

              <AppAlert
                v-if="deletionState.error"
                color="error"
                variant="subtle"
                :description="deletionState.error"
              />

              <div class="flex justify-end">
                <AppButton
                  color="error"
                  variant="solid"
                  label="Delete account"
                  :loading="deletionState.pending"
                  @click="deleteAccount"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </AppContainer>
  </div>
</template>
