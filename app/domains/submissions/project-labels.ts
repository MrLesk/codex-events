import type { AdminSubmissionStatus } from '~/domains/submissions/admin-submission-record'

export function formatAdminOperationalTeamProjectLabel(
  submissionStatus: AdminSubmissionStatus,
  projectName: string | null | undefined,
  hasEnteredSubmissionPhase: boolean
) {
  if (submissionStatus === 'none') {
    return hasEnteredSubmissionPhase
      ? 'No submission record yet'
      : 'Submission window not open yet'
  }

  if (submissionStatus === 'draft') {
    return projectName ?? 'Untitled draft'
  }

  return projectName ?? 'Untitled project'
}
