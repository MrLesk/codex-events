import type { AccountStaffEventSummary } from '#shared/domains/account/account-staff-page'

export type StaffDashboardEvent = AccountStaffEventSummary

export function formatStaffDashboardRole(event: Pick<AccountStaffEventSummary, 'staff'>) {
  return event.staff.role === 'event_admin'
    ? 'Event admin staff'
    : 'Staff'
}
