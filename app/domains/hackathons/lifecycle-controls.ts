import type { HackathonRecord } from '~/domains/hackathons/records'

export interface LifecycleMetrics {
  submittedSubmissionCount: number
  judgePoolCount: number
  lockedSubmissionCount: number
  activeAssignmentCount: number
  lockedLeaderboardEntryCount: number
  completedReviewCount: number
  completedPitchAssignmentCount?: number
  prizeCount: number
  hasCurrentWinnerTerms: boolean
}

export interface LifecycleControl {
  key: 'open_registration'
    | 'open_submission'
    | 'start_judging_preparation'
    | 'start_blind_review'
    | 'start_pitch'
    | 'start_pitch_review'
    | 'start_shortlist'
    | 'start_final_deliberation'
    | 'announce_winners'
    | 'complete'
  label: string
  description: string
  endpoint: string
  isEnabled: boolean
  reason?: string
  code?: string
}

export function getCurrentLifecycleControl(
  hackathon: HackathonRecord,
  metrics: LifecycleMetrics,
  now: Date = new Date()
): LifecycleControl | null {
  switch (hackathon.state) {
    case 'draft': {
      const registrationOpensAt = Date.parse(hackathon.registrationOpensAt)
      const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)
      const nowTimestamp = now.getTime()
      const isEnabled = nowTimestamp >= registrationOpensAt && nowTimestamp < registrationClosesAt

      let reason: string | undefined
      let code: string | undefined

      if (nowTimestamp < registrationOpensAt) {
        reason = 'Registration can only be opened once the configured registration window starts.'
        code = 'registration_window_not_open_yet'
      } else if (nowTimestamp >= registrationClosesAt) {
        reason = 'Registration can only be opened while the configured registration window is active.'
        code = 'registration_window_closed'
      }

      return {
        key: 'open_registration',
        label: 'Open Registration',
        description: 'Publish the hackathon and move it into the application phase.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/open-registration`,
        isEnabled,
        reason,
        code
      }
    }
    case 'registration_open': {
      const registrationClosesAt = Date.parse(hackathon.registrationClosesAt)
      const submissionOpensAt = Date.parse(hackathon.submissionOpensAt)
      const submissionClosesAt = Date.parse(hackathon.submissionClosesAt)
      const nowTimestamp = now.getTime()
      const isEnabled = nowTimestamp >= registrationClosesAt
        && nowTimestamp >= submissionOpensAt
        && nowTimestamp < submissionClosesAt

      let reason: string | undefined
      let code: string | undefined

      if (nowTimestamp < registrationClosesAt) {
        reason = 'Submission opens only after registration closes.'
        code = 'registration_window_still_open'
      } else if (nowTimestamp < submissionOpensAt || nowTimestamp >= submissionClosesAt) {
        reason = 'Submission can only be opened while the configured submission window is active.'
        code = 'submission_window_closed'
      }

      return {
        key: 'open_submission',
        label: 'Open Submission',
        description: 'Move the hackathon from registration into the team-and-submission phase.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/open-submission`,
        isEnabled,
        reason,
        code
      }
    }
    case 'submission_open': {
      const submissionClosesAt = Date.parse(hackathon.submissionClosesAt)
      const nowTimestamp = now.getTime()
      let reason: string | undefined
      let code: string | undefined

      if (nowTimestamp < submissionClosesAt) {
        reason = 'Submissions can only be stopped after the submission window closes.'
        code = 'submission_window_still_open'
      } else if (metrics.submittedSubmissionCount === 0) {
        reason = 'At least one submitted project is required before submissions can be stopped.'
        code = 'submitted_submissions_required'
      }

      return {
        key: 'start_judging_preparation',
        label: 'Stop Submissions',
        description: 'Close team formation and move into judging preparation while existing submissions stay editable until judging starts.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-judging-preparation`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'judging_preparation': {
      if (hackathon.blindReviewCount === 0) {
        let reason: string | undefined
        let code: string | undefined

        if (metrics.submittedSubmissionCount === 0) {
          reason = 'Pitch requires at least one submitted project.'
          code = 'submitted_submissions_required'
        }

        return {
          key: 'start_pitch',
          label: 'Start Pitch',
          description: 'Lock submitted projects, freeze prize eligibility, and open the live pitch stage.',
          endpoint: `/api/hackathons/${hackathon.id}/actions/start-pitch`,
          isEnabled: !reason,
          reason,
          code
        }
      }

      let reason: string | undefined
      let code: string | undefined

      if (metrics.submittedSubmissionCount === 0) {
        reason = 'Blind review requires at least one submitted project.'
        code = 'submitted_submissions_required'
      } else if (metrics.judgePoolCount === 0) {
        reason = 'At least one judge must be in the automatic judge pool before blind review can start.'
        code = 'judge_pool_required'
      } else if (metrics.judgePoolCount < hackathon.blindReviewCount) {
        reason = 'The automatic judge pool must include enough distinct judges for the configured blind review count.'
        code = 'distinct_blind_review_judges_required'
      }

      return {
        key: 'start_blind_review',
        label: 'Start Blind Review',
        description: 'Lock submitted projects, freeze prize eligibility, and open blind judging.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-blind-review`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'blind_review': {
      let reason: string | undefined
      let code: string | undefined

      if (metrics.lockedLeaderboardEntryCount === 0) {
        reason = hackathon.pitchReviewEnabled
          ? 'Shortlist requires at least one locked submission.'
          : 'Final deliberation requires at least one locked submission.'
        code = 'locked_submissions_required'
      } else if (metrics.completedReviewCount !== metrics.lockedLeaderboardEntryCount) {
        reason = hackathon.pitchReviewEnabled
          ? 'Every locked submission must have a completed blind-review outcome before shortlist can start.'
          : 'Every locked submission must have a completed blind-review outcome before final deliberation can start.'
        code = 'completed_reviews_required'
      }

      if (hackathon.pitchReviewEnabled) {
        return {
          key: 'start_shortlist',
          label: 'Start Shortlist',
          description: 'Move the hackathon into blind shortlist ordering before the live pitch stage begins.',
          endpoint: `/api/hackathons/${hackathon.id}/actions/start-shortlist`,
          isEnabled: !reason,
          reason,
          code
        }
      }

      return {
        key: 'start_final_deliberation',
        label: 'Start Final Deliberation',
        description: 'Move the hackathon into final score review once blind judging is complete.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-final-deliberation`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'shortlist':
      return null
    case 'pitch': {
      let reason: string | undefined
      let code: string | undefined

      if (hackathon.pitchPresentationSubmissionIds.length === 0) {
        reason = 'Pitch review requires at least one finalist submission in the pitch lineup.'
        code = 'pitch_finalists_required'
      } else if (hackathon.pitchPresentationsCompletedAt === null) {
        reason = hackathon.activePitchPresentationSubmissionId
          ? 'Finish the live pitch presentation lineup from Operations before pitch review can start.'
          : 'Enable the first pitch presentation from Operations before pitch review can start.'
        code = 'pitch_presentations_incomplete'
      } else if (metrics.judgePoolCount === 0) {
        reason = 'Pitch review requires at least one judge in the automatic judge pool.'
        code = 'judge_pool_required'
      }

      return {
        key: 'start_pitch_review',
        label: 'Start Pitch Review',
        description: 'Create post-pitch judge assignments and open the finalist review workspace.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-pitch-review`,
        isEnabled: !reason,
        reason,
        code
      }
    }
    case 'pitch_review':
      if ((metrics.completedPitchAssignmentCount ?? 0) === 0) {
        return {
          key: 'start_final_deliberation',
          label: 'Move To Final Deliberation',
          description: 'Close pitch review and open the final weighted ranking workspace using submitted pitch votes only.',
          endpoint: `/api/hackathons/${hackathon.id}/actions/start-final-deliberation`,
          isEnabled: false,
          reason: 'At least one submitted pitch review is required before final deliberation can start.',
          code: 'completed_pitch_reviews_required'
        }
      }

      return {
        key: 'start_final_deliberation',
        label: 'Move To Final Deliberation',
        description: 'Close pitch review and open the final weighted ranking workspace using submitted pitch votes only.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/start-final-deliberation`,
        isEnabled: true
      }
    case 'final_deliberation': {
      const needsWinnerTerms = metrics.prizeCount > 0 && !metrics.hasCurrentWinnerTerms

      return {
        key: 'announce_winners',
        label: 'Announce Winners',
        description: 'Publish the final ranking and initialize prize redemption when prizes are configured.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/announce-winners`,
        isEnabled: !needsWinnerTerms,
        reason: needsWinnerTerms
          ? 'Current winner terms are required before announcing winners when prizes are configured.'
          : undefined,
        code: needsWinnerTerms ? 'winner_terms_required' : undefined
      }
    }
    case 'winners_announced':
      return {
        key: 'complete',
        label: 'Complete Hackathon',
        description: 'Close the program once winners are announced and the outcome is final.',
        endpoint: `/api/hackathons/${hackathon.id}/actions/complete`,
        isEnabled: true
      }
    case 'completed':
      return null
  }
}
