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
const pendingApplicationId = ref('')
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
  if (pendingApplicationId.value) {
    return
  }

  pendingApplicationId.value = application.id

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
    pendingApplicationId.value = ''
  }
}

function certificateHref(application: AdminApplicationRecord) {
  return buildEventCertificatePath(props.eventSlug, application.userId)
}

onMounted(loadApplications)
</script>

<template>
  <div class="rounded-xl !border !border-black/8 !bg-white/78 !shadow-[0_12px_32px_-28px_rgba(15,23,42,0.5)] !backdrop-blur-xl dark:!border-white/[0.10] dark:!bg-[#151515]/64 px-5 py-5">
    <div class="space-y-1 border-b border-black/8 pb-4 dark:border-white/[0.08]">
      <h2 class="text-xl font-semibold text-highlighted dark:text-white">
        Certificates
      </h2>
      <p class="text-sm text-neutral-600 dark:text-[#A3A3A3]">
        Confirm who actually joined this event. Luma check-ins are the default, your decisions override them, and only joined participants have a public certificate.
      </p>
    </div>

    <p
      v-if="loadStatus === 'pending'"
      class="mt-4 text-sm text-neutral-600 dark:text-[#A3A3A3]"
    >
      Loading participants…
    </p>

    <AppAlert
      v-else-if="loadStatus === 'error'"
      class="mt-4"
      color="error"
      variant="soft"
      title="Participants could not be loaded"
      :description="loadErrorMessage"
    />

    <template v-else>
      <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div
          class="flex items-center gap-1.5"
          role="group"
          aria-label="Attendance filter"
        >
          <button
            v-for="filter in attendanceFilters"
            :key="filter.id"
            type="button"
            class="rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors"
            :class="activeAttendanceFilter === filter.id
              ? 'bg-black text-white dark:bg-white dark:text-black'
              : 'text-neutral-600 hover:bg-black/5 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:bg-white/10 dark:hover:text-white'"
            :data-testid="`certificates-filter-${filter.id}`"
            @click="activeAttendanceFilter = filter.id"
          >
            {{ filter.label }}
          </button>
        </div>

        <div class="flex items-center gap-3">
          <p class="text-[13px] text-neutral-500 dark:text-[#8C8C8C]">
            {{ checkedInCount }} of {{ approvedApplications.length }} checked in
          </p>
          <AppInput
            v-model="searchTerm"
            type="search"
            placeholder="Search name or email"
            class="w-56"
            data-testid="certificates-search"
          />
        </div>
      </div>

      <p
        v-if="visibleApplications.length === 0"
        class="mt-6 text-sm text-neutral-600 dark:text-[#A3A3A3]"
        data-testid="certificates-empty-state"
      >
        {{ approvedApplications.length === 0 ? 'No approved participants yet.' : 'No participants match the current filter.' }}
      </p>

      <ul
        v-else
        class="mt-4 divide-y divide-black/6 dark:divide-white/[0.07]"
      >
        <li
          v-for="application in visibleApplications"
          :key="application.id"
          class="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3.5"
          :data-testid="`certificates-row-${application.userId}`"
        >
          <div class="min-w-0">
            <p class="truncate text-[15px] font-medium text-highlighted dark:text-white">
              {{ application.user?.displayName ?? 'Unknown participant' }}
            </p>
            <p class="truncate text-[13px] text-neutral-500 dark:text-[#8C8C8C]">
              {{ application.user?.email }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
            <div class="flex flex-col items-end gap-0.5 text-right">
              <span class="flex items-center gap-1.5">
                <AppBadge
                  v-if="application.certificateHiddenAt"
                  color="neutral"
                  variant="outline"
                >
                  Hidden by participant
                </AppBadge>
                <AppBadge
                  :color="getApplicationAttendanceStatusColor(application)"
                  variant="soft"
                >
                  {{ formatApplicationAttendanceStatus(application) }}
                </AppBadge>
              </span>
              <span class="text-[12px] text-neutral-500 dark:text-[#8C8C8C]">
                {{ formatApplicationAttendanceSource(application) }}
              </span>
            </div>

            <div class="flex items-center gap-2">
              <AppButton
                size="sm"
                color="neutral"
                :variant="application.checkInOverrideStatus === 'joined' ? 'solid' : 'outline'"
                :loading="pendingApplicationId === application.id"
                :data-testid="`certificates-mark-joined-${application.userId}`"
                @click="overrideCheckIn(application, 'joined')"
              >
                Joined
              </AppButton>
              <AppButton
                size="sm"
                color="neutral"
                :variant="application.checkInOverrideStatus === 'not_joined' ? 'solid' : 'outline'"
                :loading="pendingApplicationId === application.id"
                :data-testid="`certificates-mark-not-joined-${application.userId}`"
                @click="overrideCheckIn(application, 'not_joined')"
              >
                Not joined
              </AppButton>
              <AppButton
                v-if="isApplicationCheckedIn(application) && !application.certificateHiddenAt"
                size="sm"
                color="neutral"
                variant="ghost"
                trailing-icon="i-lucide-arrow-up-right"
                :to="certificateHref(application)"
                target="_blank"
                :data-testid="`certificates-view-${application.userId}`"
              >
                Certificate
              </AppButton>
            </div>
          </div>
        </li>
      </ul>
    </template>
  </div>
</template>
