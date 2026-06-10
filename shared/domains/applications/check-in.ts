export const applicationCheckInOverrideStatuses = ['joined', 'not_joined'] as const

export type ApplicationCheckInOverrideStatus = typeof applicationCheckInOverrideStatuses[number]

export interface ApplicationCheckInState {
  checkedInAt: string | null
  checkInOverrideStatus: ApplicationCheckInOverrideStatus | null
}

export function isApplicationEffectivelyCheckedIn(application: ApplicationCheckInState) {
  if (application.checkInOverrideStatus) {
    return application.checkInOverrideStatus === 'joined'
  }

  return Boolean(application.checkedInAt)
}

export function resolveApplicationAttendanceSource(application: ApplicationCheckInState) {
  if (application.checkInOverrideStatus) {
    return 'manual' as const
  }

  return application.checkedInAt ? 'luma' as const : null
}
