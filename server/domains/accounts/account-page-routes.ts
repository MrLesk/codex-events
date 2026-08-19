import { accountOverviewPageRoute } from './account-overview-page'
import { accountStaffPageRoute } from './account-staff-page'
import { accountJudgeInboxPageRoute } from '#server/domains/judging/account-judge-inbox-page'
import { accountPrizeRedemptionsPageRoute } from '#server/domains/prize-redemptions/account-workspace-page'

export const accountPageRouteDefinitions = {
  'overview': accountOverviewPageRoute,
  'judging': accountJudgeInboxPageRoute,
  'staff-workspace': accountStaffPageRoute,
  'prize-redemptions-workspace': accountPrizeRedemptionsPageRoute
} as const
