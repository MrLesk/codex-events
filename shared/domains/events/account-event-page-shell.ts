import type {
  AccountEventEntryAccess,
  AccountEventEntryEvent,
  AccountEventEntryTabVisibility
} from './account-event-entry-page'

export interface AccountEventPageShell {
  event: AccountEventEntryEvent
  access: AccountEventEntryAccess | null
  tabVisibility: AccountEventEntryTabVisibility
  applicationStatus: AccountEventEntryAccess['applicationStatus']
  lumaSyncStatus: 'not_synced' | 'approve_synced' | 'reject_synced' | 'approve_failed' | 'reject_failed' | null
}
