import { readFileSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

const resolveAccountEventPageContext = vi.hoisted(() => vi.fn())
const contractSource = readFileSync(
  new URL('../../../../../server/domains/events/account-event-page-contract.ts', import.meta.url),
  'utf8'
)

vi.mock('../../../../../server/domains/events/account-event-page-context', () => ({
  resolveAccountEventPageContext
}))

describe('account-event page route contract', () => {
  beforeEach(() => {
    vi.resetModules()
    resolveAccountEventPageContext.mockReset()
    resolveAccountEventPageContext.mockResolvedValue({
      actor: {},
      authorization: {
        eventId: 'event_1',
        isPlatformAdmin: false,
        explicitRole: 'event_admin',
        isEventAdmin: true,
        canReviewThroughAssignment: false,
        isInJudgePool: false,
        isStaff: false,
        staffTrackId: null,
        canViewParticipantsAndTeams: true
      },
      database: {},
      event: {
        id: 'event_1',
        slug: 'fixture-event',
        name: 'Fixture event',
        eventType: 'hackathon',
        state: 'submission_open'
      }
    })
  })

  test('keeps the child extension point named, typed, and runtime-validated', () => {
    expect(contractSource).toContain('page: TPageName')
    expect(contractSource).toContain('schema: TSchema')
    expect(contractSource).toContain('authorize: AccountEventPageAuthorizer')
    expect(contractSource).toContain('accountEventPageParamsSchema.parse')
    expect(contractSource).toContain('definition.schema.parse')
    expect(contractSource).toContain('await definition.authorize(context)')
    expect(contractSource).not.toContain('include')
    expect(contractSource).not.toContain('resourceMap')
  })

  test('requires a named page and concrete Zod schema, then validates output', async () => {
    const {
      defineAccountEventPageRoute,
      executeAccountEventPageRoute
    } = await import('../../../../../server/domains/events/account-event-page-contract')
    const schema = z.object({
      phase: z.string()
    })
    const authorize = vi.fn()
    const load = vi.fn(() => ({ phase: 'submission_open' }))
    const route = defineAccountEventPageRoute({
      page: 'operations',
      schema,
      authorize,
      load
    })

    expect(route.page).toBe('operations')
    expect(route.schema).toBe(schema)

    const result = await executeAccountEventPageRoute({} as never, 'fixture-event', route)

    expect(result).toEqual({
      data: {
        event: {
          id: 'event_1',
          slug: 'fixture-event',
          name: 'Fixture event',
          eventType: 'hackathon',
          state: 'submission_open'
        },
        visibility: {
          canManage: true,
          canJudge: false,
          canViewParticipantsAndTeams: true,
          isStaff: false
        },
        page: {
          phase: 'submission_open'
        }
      }
    })
    expect(resolveAccountEventPageContext).toHaveBeenCalledOnce()
    expect(authorize).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledOnce()
    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(load.mock.invocationCallOrder[0])
  })

  test('rejects invalid named routes and invalid child payloads', async () => {
    const {
      accountEventPageParamsSchema,
      defineAccountEventPageRoute,
      executeAccountEventPageRoute
    } = await import('../../../../../server/domains/events/account-event-page-contract')
    const invalidPayloadRoute = defineAccountEventPageRoute({
      page: 'entry',
      schema: z.object({ title: z.string() }),
      authorize: vi.fn(),
      load: () => ({ title: 42 } as never)
    })

    expect(accountEventPageParamsSchema.safeParse({
      slug: 'not a slug',
      page: 'entry'
    }).success).toBe(false)
    expect(accountEventPageParamsSchema.safeParse({
      slug: 'fixture-event',
      page: 'not-a-page'
    }).success).toBe(false)
    await expect(executeAccountEventPageRoute(
      {} as never,
      'fixture-event',
      invalidPayloadRoute
    )).rejects.toMatchObject({ name: 'ZodError' })
  })
})
