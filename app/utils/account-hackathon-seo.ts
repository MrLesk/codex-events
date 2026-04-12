import type { AccountHackathonWorkspaceTab } from '~/utils/account-hackathon-tabs'

export function getAccountHackathonSeoContent(
  tab: AccountHackathonWorkspaceTab,
  hackathonName: string
) {
  switch (tab) {
    case 'overview':
      return {
        title: `${hackathonName} Overview | Codex Hackathons`,
        description: `See your status, timeline, and key details for ${hackathonName}.`
      }
    case 'workspace':
      return {
        title: `Workspace | ${hackathonName} | Codex Hackathons`,
        description: `Manage your participation, team workspace, and submission for ${hackathonName}.`
      }
    case 'prizes':
      return {
        title: `Prizes | ${hackathonName} | Codex Hackathons`,
        description: `See the prizes for ${hackathonName}.`
      }
    case 'details':
      return {
        title: `Details | ${hackathonName} | Codex Hackathons`,
        description: `See the schedule, location, and judging details for ${hackathonName}.`
      }
    case 'judges':
      return {
        title: `Judges | ${hackathonName} | Codex Hackathons`,
        description: `See who is judging ${hackathonName}.`
      }
    case 'staff':
      return {
        title: `Staff | ${hackathonName} | Codex Hackathons`,
        description: `See the staff supporting ${hackathonName}.`
      }
    case 'judging':
      return {
        title: `Judging | ${hackathonName} | Codex Hackathons`,
        description: `Review your judging queue and progress for ${hackathonName}.`
      }
    case 'participants':
      return {
        title: `Participants | ${hackathonName} | Codex Hackathons`,
        description: `Review participant applications and statuses for ${hackathonName}.`
      }
    case 'teams':
      return {
        title: `Teams | ${hackathonName} | Codex Hackathons`,
        description: `See the teams taking part in ${hackathonName}.`
      }
    case 'submissions':
      return {
        title: `Submissions | ${hackathonName} | Codex Hackathons`,
        description: `See team submissions and competition status for ${hackathonName}.`
      }
    case 'operations':
      return {
        title: `Manage ${hackathonName} | Codex Hackathons`,
        description: `Run approvals, judging, and outcomes for ${hackathonName}.`
      }
    case 'settings':
      return {
        title: `Settings | ${hackathonName} | Codex Hackathons`,
        description: `Update the configuration, terms, and judging criteria for ${hackathonName}.`
      }
  }
}
