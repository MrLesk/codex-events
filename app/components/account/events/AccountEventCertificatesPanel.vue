<script setup lang="ts">
import type { ApiDataResponse, ApiListResponse } from '~/lib/api'
import { listAllPaginatedItems, normalizeApiError } from '~/lib/api'
import type { AdminApplicationRecord } from '~/domains/applications/admin-application-record'
import {
  formatApplicationAttendanceSource,
  formatApplicationAttendanceStatus,
  getApplicationAttendanceStatusColor,
  isApplicationCheckedIn
} from '~/domains/applications/admin-application-record'
import { buildProfileIconHref } from '~/domains/accounts/profile-icon'
import { formatTimestamp } from '~/lib/date-formatting'
import type { ApplicationCheckInOverrideStatus } from '#shared/domains/applications/check-in'
import { buildEventCertificatePath } from '#shared/domains/events/certificates'

const props = defineProps<{
  eventId: string
  eventSlug: string
}>()

const toast = useToast()
const eventId = computed(() => props.eventId.trim())

type LoadStatus = 'idle' | 'pending' | 'success' | 'error'

const applications = ref<AdminApplicationRecord[]>([])
const loadStatus = ref<LoadStatus>('pending')
const loadErrorMessage = ref('')
const pendingActionKey = ref('')
const searchTerm = ref('')

const attendanceFilters = [
  { id: 'all', label: 'All' },
  { id: 'checked_in', label: 'Checked in' },
  { id: 'not_checked_in', label: 'Not checked in' }
] as const

type AttendanceFilter = (typeof attendanceFilters)[number]['id']

const activeAttendanceFilter = ref<AttendanceFilter>('all')

const approvedApplications = computed(() =>
  applications.value.filter(application => application.status === 'approved')
)

const visibleApplications = computed(() => {
  const normalizedSearch = searchTerm.value.trim().toLowerCase()

  return approvedApplications.value.filter((application) => {
    if (activeAttendanceFilter.value === 'checked_in' && !isApplicationCheckedIn(application)) {
      return false
    }

    if (activeAttendanceFilter.value === 'not_checked_in' && isApplicationCheckedIn(application)) {
      return false
    }

    if (!normalizedSearch) {
      return true
    }

    return [application.user?.displayName, application.user?.email]
      .some(value => value?.toLowerCase().includes(normalizedSearch))
  })
})

const checkedInCount = computed(() => approvedApplications.value.filter(application => isApplicationCheckedIn(application)).length)
const notCheckedInCount = computed(() => approvedApplications.value.length - checkedInCount.value)
const attendanceFilterTabs = computed(() =>
  attendanceFilters.map(filter => ({
    ...filter,
    count: filter.id === 'all'
      ? approvedApplications.value.length
      : filter.id === 'checked_in'
        ? checkedInCount.value
        : notCheckedInCount.value
  }))
)

async function loadApplications() {
  loadStatus.value = 'pending'
  loadErrorMessage.value = ''

  try {
    applications.value = await listAllPaginatedItems(
      async (page, pageSize) => await $fetch<ApiListResponse<AdminApplicationRecord>>(
        `/api/events/${eventId.value}/applications`,
        {
          query: {
            page,
            page_size: pageSize,
            status: 'approved'
          }
        }
      ),
      100
    )
    loadStatus.value = 'success'
  } catch (error) {
    applications.value = []
    loadStatus.value = 'error'
    const message = normalizeApiError(error).message
    loadErrorMessage.value = message && message.length > 0 ? message : 'Participants could not be loaded right now.'
  }
}

async function overrideCheckIn(application: AdminApplicationRecord, status: ApplicationCheckInOverrideStatus) {
  if (pendingActionKey.value) {
    return
  }

  pendingActionKey.value = getCheckInActionKey(application, status)

  try {
    const response = await $fetch<ApiDataResponse<AdminApplicationRecord>>(
      `/api/events/${eventId.value}/applications/${application.id}/actions/override-check-in`,
      {
        method: 'POST',
        body: { status }
      }
    )

    applications.value = applications.value.map(record => record.id === application.id
      ? { ...record, ...response.data, user: record.user }
      : record)
  } catch (error) {
    toast.add({
      title: 'Attendance could not be updated',
      description: normalizeApiError(error).message,
      color: 'error'
    })
  } finally {
    pendingActionKey.value = ''
  }
}

async function setCertificateRevoked(application: AdminApplicationRecord, revoked: boolean) {
  if (pendingActionKey.value) {
    return
  }

  pendingActionKey.value = getCertificateRevocationActionKey(application, revoked)

  try {
    const response = await $fetch<ApiDataResponse<AdminApplicationRecord>>(
      `/api/events/${eventId.value}/applications/${application.id}/actions/set-certificate-revocation`,
      {
        method: 'POST',
        body: { revoked }
      }
    )

    applications.value = applications.value.map(record => record.id === application.id
      ? { ...record, ...response.data, user: record.user }
      : record)

    toast.add({
      title: revoked ? 'Certificate revoked' : 'Certificate restored',
      color: 'success'
    })
  } catch (error) {
    toast.add({
      title: revoked ? 'Certificate could not be revoked' : 'Certificate could not be restored',
      description: normalizeApiError(error).message,
      color: 'error'
    })
  } finally {
    pendingActionKey.value = ''
  }
}

function certificateHref(application: AdminApplicationRecord) {
  return buildEventCertificatePath(props.eventSlug, application.userId)
}

function canViewCertificate(application: AdminApplicationRecord) {
  return isApplicationCheckedIn(application)
    && !application.certificateHiddenAt
    && !application.certificateRevokedAt
}

function getCheckInActionKey(application: AdminApplicationRecord, status: ApplicationCheckInOverrideStatus) {
  return `${application.id}:check-in:${status}`
}

function isCheckInActionPending(application: AdminApplicationRecord, status: ApplicationCheckInOverrideStatus) {
  return pendingActionKey.value === getCheckInActionKey(application, status)
}

function isCheckInActionDisabled(application: AdminApplicationRecord, status: ApplicationCheckInOverrideStatus) {
  return pendingActionKey.value.length > 0 && !isCheckInActionPending(application, status)
}

function getCertificateRevocationActionKey(application: AdminApplicationRecord, revoked: boolean) {
  return `${application.id}:certificate:${revoked ? 'revoke' : 'restore'}`
}

function isCertificateRevocationActionPending(application: AdminApplicationRecord, revoked: boolean) {
  return pendingActionKey.value === getCertificateRevocationActionKey(application, revoked)
}

function isCertificateRevocationActionDisabled(application: AdminApplicationRecord, revoked: boolean) {
  return pendingActionKey.value.length > 0 && !isCertificateRevocationActionPending(application, revoked)
}

function getCertificateDecisionButtonClass(status: ApplicationCheckInOverrideStatus, isActive: boolean) {
  const baseClass = 'inline-flex w-full items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-45'

  if (isActive) {
    return status === 'joined'
      ? `${baseClass} border-success/30 bg-success/12 text-success hover:bg-success/16`
      : `${baseClass} border-error/30 bg-error/12 text-error hover:bg-error/16`
  }

  return `${baseClass} border-black/8 bg-transparent text-toned hover:border-black/20 hover:text-highlighted dark:border-white/[0.08] dark:hover:border-white/[0.18] dark:hover:text-white`
}

function getParticipantIdentityLabel(application: AdminApplicationRecord) {
  if (application.user?.displayName && application.user?.email && application.user.displayName !== application.user.email) {
    return `${application.user.displayName} - ${application.user.email}`
  }

  return application.user?.displayName ?? application.user?.email ?? application.userId
}

function getParticipantAvatarAlt(application: AdminApplicationRecord) {
  return application.user?.displayName ?? application.user?.email ?? application.userId
}

function getParticipantProfileIconHref(application: AdminApplicationRecord) {
  return buildProfileIconHref(
    application.userId,
    application.user?.profileIconUpdatedAt,
    eventId.value
  )
}

function formatCheckedInTimestamp(application: AdminApplicationRecord) {
  return application.checkedInAt
    ? `Checked in ${formatTimestamp(application.checkedInAt, 'recently')}`
    : null
}

onMounted(loadApplications)
</script>

<template>
  <AppCard class="rounded-xl !border !border-black/10 !bg-white/72 !shadow-[0_20px_40px_-24px_rgba(15,23,42,0.4)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#101010]/60">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold text-highlighted">
          Certificates
        </h2>
        <p class="text-sm text-muted">
          Confirm who actually joined this event. Luma check-ins are the default, your decisions override them, and joined participants can generate certificates unless generation is disabled or revoked.
        </p>
      </div>
    </template>

    <AppAlert
      v-if="loadStatus === 'pending'"
      color="neutral"
      variant="soft"
      title="Loading participants"
      description="Participant records are still loading."
    />

    <AppAlert
      v-else-if="loadStatus === 'error'"
      color="error"
      variant="soft"
      title="Participants could not be loaded"
      :description="loadErrorMessage"
    />

    <template v-else>
      <section class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 flex flex-col gap-4 rounded-xl p-2">
        <div class="flex min-w-0 flex-wrap items-center gap-2">
          <button
            v-for="filter in attendanceFilterTabs"
            :key="filter.id"
            type="button"
            class="inline-flex min-w-max grow basis-0 items-center justify-between gap-2 rounded-lg px-4 py-1.5 text-[13px] transition-colors sm:min-w-0 sm:grow-0 sm:basis-auto sm:justify-start"
            :class="activeAttendanceFilter === filter.id
              ? 'bg-black text-white font-medium dark:bg-white dark:text-black'
              : 'bg-black/6 text-neutral-700 hover:bg-black/10 hover:text-highlighted dark:bg-white/[0.08] dark:text-[#A3A3A3] dark:hover:bg-white/[0.12] dark:hover:text-white'"
            :data-testid="`certificates-filter-${filter.id}`"
            @click="activeAttendanceFilter = filter.id"
          >
            <span>{{ filter.label }}</span>
            <span
              class="rounded-full px-2 py-0.5 text-[11px] font-semibold leading-none"
              :class="activeAttendanceFilter === filter.id ? 'bg-white/15 text-white dark:bg-black/10 dark:text-black' : 'bg-black/6 text-neutral-700 dark:bg-white/[0.08] dark:text-[#B0B0B0]'"
            >
              {{ filter.count }}
            </span>
          </button>
        </div>

        <div class="px-2 pb-2">
          <label
            for="certificates-search"
            class="sr-only"
          >
            Search participants
          </label>
          <AppInput
            id="certificates-search"
            v-model="searchTerm"
            type="search"
            name="certificates-search"
            autocomplete="off"
            autocapitalize="none"
            autocorrect="off"
            spellcheck="false"
            data-1p-ignore="true"
            data-lpignore="true"
            data-bwignore="true"
            placeholder="Search name or email"
            data-testid="certificates-search"
          />
          <p class="mt-2 text-[13px] text-neutral-500 dark:text-[#8C8C8C]">
            {{ checkedInCount }} of {{ approvedApplications.length }} checked in
          </p>
        </div>
      </section>

      <AppAlert
        v-if="visibleApplications.length === 0"
        class="mt-5"
        color="neutral"
        variant="soft"
        :title="approvedApplications.length === 0 ? 'No approved participants yet' : 'No participants match this view'"
        :description="approvedApplications.length === 0 ? 'Approved participants will appear here before certificates can be issued.' : 'Try a different attendance filter or search.'"
        data-testid="certificates-empty-state"
      />

      <div
        v-else
        class="mt-5 grid gap-5"
      >
        <section
          v-for="application in visibleApplications"
          :key="application.id"
          class="!border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 overflow-hidden rounded-xl"
          :data-testid="`certificates-row-${application.userId}`"
        >
          <article class="grid gap-5 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_14rem] sm:items-start xl:items-center">
            <div class="min-w-0 space-y-3">
              <div class="flex min-w-0 items-start gap-3">
                <AppAvatar
                  size="lg"
                  :src="getParticipantProfileIconHref(application)"
                  :alt="getParticipantAvatarAlt(application)"
                  class="shrink-0"
                />

                <div class="min-w-0 space-y-1">
                  <p class="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                    Participant
                  </p>
                  <div class="flex flex-wrap items-center gap-2">
                    <h4 class="text-lg font-semibold text-highlighted">
                      {{ getParticipantIdentityLabel(application) }}
                    </h4>
                    <AppBadge
                      :color="getApplicationAttendanceStatusColor(application)"
                      variant="soft"
                    >
                      {{ formatApplicationAttendanceStatus(application) }}
                    </AppBadge>
                    <AppBadge
                      v-if="application.certificateHiddenAt"
                      color="neutral"
                      variant="outline"
                    >
                      Certificate generation disabled
                    </AppBadge>
                    <AppBadge
                      v-if="application.certificateRevokedAt"
                      color="error"
                      variant="soft"
                    >
                      Certificate revoked
                    </AppBadge>
                    <span
                      v-if="formatCheckedInTimestamp(application)"
                      class="rounded-full border border-black/10 px-3 py-1 text-xs text-highlighted dark:border-white/[0.12]"
                    >
                      {{ formatCheckedInTimestamp(application) }}
                    </span>
                  </div>
                </div>
              </div>

              <div class="flex flex-wrap gap-2 text-xs text-muted">
                <span class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]">
                  {{ formatApplicationAttendanceSource(application) }}
                </span>
                <span
                  v-if="application.user?.email"
                  class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                >
                  Account: {{ application.user.email }}
                </span>
                <span
                  v-if="application.user?.lumaEmail"
                  class="rounded-full border border-black/10 px-3 py-1 text-highlighted dark:border-white/[0.12]"
                >
                  Luma: {{ application.user.lumaEmail }}
                </span>
              </div>
            </div>

            <div class="grid gap-2 self-center xl:pl-2">
              <button
                type="button"
                :class="getCertificateDecisionButtonClass('joined', application.checkInOverrideStatus === 'joined')"
                :disabled="isCheckInActionDisabled(application, 'joined')"
                :data-testid="`certificates-mark-joined-${application.userId}`"
                @click="overrideCheckIn(application, 'joined')"
              >
                <span>Joined</span>
                <AppIcon
                  v-if="isCheckInActionPending(application, 'joined')"
                  name="i-lucide-loader-circle"
                  class="size-4 animate-spin"
                />
                <AppIcon
                  v-else
                  name="i-lucide-check"
                  class="size-4"
                />
              </button>
              <button
                type="button"
                :class="getCertificateDecisionButtonClass('not_joined', application.checkInOverrideStatus === 'not_joined')"
                :disabled="isCheckInActionDisabled(application, 'not_joined')"
                :data-testid="`certificates-mark-not-joined-${application.userId}`"
                @click="overrideCheckIn(application, 'not_joined')"
              >
                <span>Not joined</span>
                <AppIcon
                  v-if="isCheckInActionPending(application, 'not_joined')"
                  name="i-lucide-loader-circle"
                  class="size-4 animate-spin"
                />
                <AppIcon
                  v-else
                  name="i-lucide-x"
                  class="size-4"
                />
              </button>
              <AppButton
                v-if="canViewCertificate(application)"
                color="neutral"
                variant="outline"
                trailing-icon="i-lucide-arrow-up-right"
                :to="certificateHref(application)"
                class="w-full justify-between rounded-xl"
                :data-testid="`certificates-view-${application.userId}`"
              >
                Certificate
              </AppButton>
              <AppButton
                v-if="canViewCertificate(application)"
                color="error"
                variant="outline"
                icon="i-lucide-ban"
                class="w-full justify-between rounded-xl"
                :loading="isCertificateRevocationActionPending(application, true)"
                :disabled="isCertificateRevocationActionDisabled(application, true)"
                :data-testid="`certificates-revoke-${application.userId}`"
                @click="setCertificateRevoked(application, true)"
              >
                Revoke certificate
              </AppButton>
              <AppButton
                v-else-if="application.certificateRevokedAt"
                color="neutral"
                variant="outline"
                icon="i-lucide-rotate-ccw"
                class="w-full justify-between rounded-xl"
                :loading="isCertificateRevocationActionPending(application, false)"
                :disabled="isCertificateRevocationActionDisabled(application, false)"
                :data-testid="`certificates-restore-${application.userId}`"
                @click="setCertificateRevoked(application, false)"
              >
                Restore certificate
              </AppButton>
            </div>
          </article>
        </section>
      </div>
    </template>
  </AppCard>
</template>
