import { beforeEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

const resolveAccountEventPageContext = vi.hoisted(() => vi.fn())
const resolveJudgeAssignmentAuthorization = vi.hoisted(() => vi.fn())

vi.mock('../../../../../server/domains/events/account-event-page-context', () => ({
  resolveAccountEventPageContext
}))

vi.mock('../../../../../server/auth/authorization', () => ({
  resolveJudgeAssignmentAuthorization
}))

describe('judge assignment page route contract', () => {
  beforeEach(() => {
    vi.resetModules()
    resolveAccountEventPageContext.mockReset()
    resolveJudgeAssignmentAuthorization.mockReset()
    resolveAccountEventPageContext.mockResolvedValue({
      actor: {},
      authorization: {},
      database: {},
      event: {
        id: 'event_1',
        slug: 'fixture-event',
        name: 'Fixture event',
        eventType: 'hackathon',
        state: 'blind_review'
      }
    })
    resolveJudgeAssignmentAuthorization.mockResolvedValue({
      assignmentId: 'assignment_1',
      eventId: 'event_1',
      assignedJudgeUserId: 'judge_1',
      canAccess: true,
      visibility: 'blind'
    })
  })

  test('authorizes before the assignment loader and resolves context/assignment once', async () => {
    const {
      defineAccountJudgeAssignmentPageRoute,
      executeAccountJudgeAssignmentPageRoute
    } = await import('../../../../../server/domains/events/account-event-page-contract')
    const authorize = vi.fn()
    const load = vi.fn(() => ({ title: 'assignment' }))
    const route = defineAccountJudgeAssignmentPageRoute({
      schema: z.object({ title: z.string() }),
      authorize,
      load
    })

    const result = await executeAccountJudgeAssignmentPageRoute(
      {} as never,
      'fixture-event',
      'assignment_1',
      route
    )

    expect(result).toEqual({ data: { title: 'assignment' } })
    expect(resolveAccountEventPageContext).toHaveBeenCalledOnce()
    expect(resolveJudgeAssignmentAuthorization).toHaveBeenCalledOnce()
    expect(authorize).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledOnce()
    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(load.mock.invocationCallOrder[0])
    expect(load).toHaveBeenCalledWith(expect.anything(), 'assignment_1')
  })

  test('rejects an invalid assignment output after authorization', async () => {
    const {
      defineAccountJudgeAssignmentPageRoute,
      executeAccountJudgeAssignmentPageRoute
    } = await import('../../../../../server/domains/events/account-event-page-contract')
    const route = defineAccountJudgeAssignmentPageRoute({
      schema: z.object({ title: z.string() }),
      authorize: vi.fn(),
      load: vi.fn(() => ({ title: 42 }) as never)
    })

    await expect(executeAccountJudgeAssignmentPageRoute(
      {} as never,
      'fixture-event',
      'assignment_1',
      route
    )).rejects.toMatchObject({ name: 'ZodError' })
  })
})
