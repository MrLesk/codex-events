import { beforeEach, describe, expect, test, vi } from 'vitest'
import { z } from 'zod'

const getRequestActor = vi.hoisted(() => vi.fn())
const assertRegularPlatformAccess = vi.hoisted(() => vi.fn())
const getDatabase = vi.hoisted(() => vi.fn())

vi.mock('../../../../../server/auth/actor', () => ({
  getRequestActor,
  assertRegularPlatformAccess
}))

vi.mock('../../../../../server/database/client', () => ({
  getDatabase
}))

describe('global account page route contract', () => {
  beforeEach(() => {
    vi.resetModules()
    getRequestActor.mockReset()
    assertRegularPlatformAccess.mockReset()
    getDatabase.mockReset()
    getRequestActor.mockResolvedValue({
      platformUser: {
        id: 'user_1'
      }
    })
    getDatabase.mockReturnValue({})
  })

  test('resolves actor and database once, authorizes before loading, and validates output', async () => {
    const {
      defineAccountPageRoute,
      executeAccountPageRoute
    } = await import('../../../../../server/domains/accounts/account-page-contract')
    const authorize = vi.fn()
    const load = vi.fn(() => ({ title: 'overview' }))
    const route = defineAccountPageRoute({
      page: 'overview',
      schema: z.object({ title: z.string() }),
      authorize,
      load
    })

    const result = await executeAccountPageRoute({} as never, route)

    expect(result).toEqual({ data: { title: 'overview' } })
    expect(getRequestActor).toHaveBeenCalledOnce()
    expect(assertRegularPlatformAccess).toHaveBeenCalledOnce()
    expect(getDatabase).toHaveBeenCalledOnce()
    expect(authorize).toHaveBeenCalledOnce()
    expect(load).toHaveBeenCalledOnce()
    expect(authorize.mock.invocationCallOrder[0]).toBeLessThan(load.mock.invocationCallOrder[0])
    expect(load).toHaveBeenCalledWith(
      {
        actor: expect.anything(),
        database: expect.anything()
      },
      undefined
    )
  })

  test('rejects an invalid global page output after authorization', async () => {
    const {
      defineAccountPageRoute,
      executeAccountPageRoute
    } = await import('../../../../../server/domains/accounts/account-page-contract')
    const route = defineAccountPageRoute({
      page: 'staff-workspace',
      schema: z.object({ title: z.string() }),
      authorize: vi.fn(),
      load: vi.fn(() => ({ title: 42 }) as never)
    })

    await expect(executeAccountPageRoute({} as never, route)).rejects.toMatchObject({
      name: 'ZodError'
    })
  })
})
