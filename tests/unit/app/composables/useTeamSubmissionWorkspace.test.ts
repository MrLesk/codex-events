import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, nextTick, ref, toValue, watch } from 'vue'

import type { TeamSubmissionRecord } from '../../../../app/utils/team-submission'

const apiFetch = vi.fn()

vi.mock('~/utils/team-submission', async () => await import('../../../../app/utils/team-submission'))

function buildSubmission(
  overrides: Partial<TeamSubmissionRecord> = {}
): TeamSubmissionRecord {
  return {
    id: 'submission_1',
    teamId: 'team_1',
    trackId: null,
    status: 'draft',
    projectName: 'North Star',
    summary: 'SSR submission test payload.',
    repositoryUrl: 'https://github.com/openai/north-star',
    demoUrl: 'https://north-star.example.com',
    isPubliclyVisible: false,
    submittedAt: null,
    lockedAt: null,
    withdrawnAt: null,
    disqualifiedAt: null,
    createdAt: '2026-04-11T08:00:00.000Z',
    updatedAt: '2026-04-11T08:00:00.000Z',
    ...overrides
  }
}

async function flushWorkspace() {
  await Promise.resolve()
  await Promise.resolve()
  await nextTick()
}

async function waitFor(predicate: () => boolean) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    await flushWorkspace()

    if (predicate()) {
      return
    }
  }

  throw new Error('Timed out waiting for submission workspace state.')
}

describe('useTeamSubmissionWorkspace', () => {
  beforeEach(() => {
    vi.resetModules()
    apiFetch.mockReset()

    vi.stubGlobal('ref', ref)
    vi.stubGlobal('computed', computed)
    vi.stubGlobal('watch', watch)
    vi.stubGlobal('toValue', toValue)
    vi.stubGlobal('$fetch', apiFetch)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('uses the provided SSR submission state without an initial fetch', async () => {
    const { useTeamSubmissionWorkspace } = await import('../../../../app/composables/useTeamSubmissionWorkspace')

    const workspace = useTeamSubmissionWorkspace({
      state: 'submission_open'
    } as never, {
      visibleHackathonId: 'hackathon_1',
      team: {
        id: 'team_1',
        isPersisted: true
      },
      canViewSubmission: true,
      canManageSubmission: true,
      initialSubmission: buildSubmission(),
      hasInitialSubmissionState: true
    })

    await flushWorkspace()

    expect(workspace.currentSubmission.value).toEqual(buildSubmission())
    expect(workspace.currentSubmissionStatus.value).toBe('success')
    expect(apiFetch).not.toHaveBeenCalled()
  })

  test('fetches the submission once the team changes beyond the initial SSR state', async () => {
    const { useTeamSubmissionWorkspace } = await import('../../../../app/composables/useTeamSubmissionWorkspace')

    const team = ref<{
      id: string
      isPersisted?: boolean
    } | null>({
      id: 'team_1',
      isPersisted: true
    })
    const initialSubmission = ref<TeamSubmissionRecord | null>(buildSubmission())
    const hasInitialSubmissionState = ref(true)

    apiFetch.mockResolvedValue({
      data: buildSubmission({
        id: 'submission_2',
        teamId: 'team_2',
        projectName: 'Refetched Project'
      })
    })

    const workspace = useTeamSubmissionWorkspace({
      state: 'submission_open'
    } as never, {
      visibleHackathonId: 'hackathon_1',
      team,
      canViewSubmission: true,
      canManageSubmission: true,
      initialSubmission,
      hasInitialSubmissionState
    })

    await flushWorkspace()

    hasInitialSubmissionState.value = false
    initialSubmission.value = null
    team.value = {
      id: 'team_2',
      isPersisted: true
    }

    await waitFor(() => workspace.currentSubmission.value?.teamId === 'team_2')

    expect(workspace.currentSubmissionStatus.value).toBe('success')
    expect(apiFetch).toHaveBeenCalledWith('/api/hackathons/hackathon_1/teams/team_2/submission')
  })

  test('updates submission public visibility through the dedicated route', async () => {
    const { useTeamSubmissionWorkspace } = await import('../../../../app/composables/useTeamSubmissionWorkspace')

    apiFetch.mockResolvedValue({
      data: buildSubmission({
        status: 'locked',
        isPubliclyVisible: true
      })
    })

    const workspace = useTeamSubmissionWorkspace({
      state: 'completed'
    } as never, {
      visibleHackathonId: 'hackathon_1',
      team: {
        id: 'team_1',
        isPersisted: true
      },
      canViewSubmission: true,
      canManageSubmission: true,
      initialSubmission: buildSubmission({
        status: 'locked',
        isPubliclyVisible: false
      }),
      hasInitialSubmissionState: true
    })

    await flushWorkspace()

    await workspace.updateCurrentSubmissionPublicVisibility(true)

    expect(apiFetch).toHaveBeenCalledWith('/api/hackathons/hackathon_1/teams/team_1/submission/public-visibility', {
      method: 'PATCH',
      body: {
        isPubliclyVisible: true
      }
    })
    expect(workspace.currentSubmission.value?.isPubliclyVisible).toBe(true)
  })
})
