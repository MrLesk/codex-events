import { readFileSync } from 'node:fs'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { computed, ref, toValue } from 'vue'

const useApiData = vi.hoisted(() => vi.fn())
const useSessionActor = vi.hoisted(() => vi.fn())
const useAuthorizationCache = vi.hoisted(() => vi.fn())
const useAbortableRequest = vi.hoisted(() => vi.fn())
const pageRequestSource = readFileSync(
  new URL('../../../../app/composables/useAccountEventPageRequest.ts', import.meta.url),
  'utf8'
)

type PageRequestHandler = (context: {
  apiFetch: (path: string, options: { signal: AbortSignal }) => Promise<unknown>
  signal: AbortSignal
}) => Promise<unknown>

vi.mock('../../../../app/composables/useApiData', () => ({
  useApiData
}))

vi.mock('../../../../app/composables/useSessionActor', () => ({
  useSessionActor
}))

vi.mock('../../../../app/composables/useAuthorizationCache', () => ({
  useAuthorizationCache
}))

vi.mock('../../../../app/composables/useAbortableRequest', () => ({
  useAbortableRequest
}))

describe('useAccountEventPageRequest', () => {
  let capturedHandler: PageRequestHandler | undefined
  let capturedOptions: Record<string, unknown>
  let sessionEnsureLoaded: ReturnType<typeof vi.fn>
  let activeControllers: Map<string, AbortController>

  beforeEach(() => {
    vi.resetModules()
    useApiData.mockReset()
    useSessionActor.mockReset()
    useAuthorizationCache.mockReset()
    useAbortableRequest.mockReset()
    activeControllers = new Map()
    sessionEnsureLoaded = vi.fn(async () => undefined)

    useSessionActor.mockReturnValue({
      actor: ref({ kind: 'platform_user' }),
      bootstrap: ref({ actor: { kind: 'platform_user' }, capabilities: {} }),
      capabilities: ref({}),
      ensureLoaded: sessionEnsureLoaded
    })
    useAuthorizationCache.mockReturnValue({
      authorizationGeneration: ref(3)
    })
    useAbortableRequest.mockReturnValue({
      createSignal(channel: string) {
        activeControllers.get(channel)?.abort()
        const controller = new AbortController()
        activeControllers.set(channel, controller)
        return controller.signal
      },
      abort(channel: string) {
        activeControllers.get(channel)?.abort()
        activeControllers.delete(channel)
      }
    })
    useApiData.mockImplementation((key, handler, options) => {
      capturedHandler = handler
      capturedOptions = options
      return {
        clear: vi.fn(),
        data: ref(null),
        error: ref(null),
        pending: ref(false),
        refresh: vi.fn(),
        status: ref('idle')
      }
    })

    vi.stubGlobal('computed', computed)
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('toValue', toValue)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  test('uses the shared bootstrap/client boundary without a feature-local session read or refresh', () => {
    expect(pageRequestSource).not.toContain('/api/session')
    expect(pageRequestSource).not.toContain('.refresh(')
    expect(pageRequestSource).not.toContain('$fetch')
  })

  test('waits for shared bootstrap and makes one generation-protected page request', async () => {
    const { useAccountEventPageRequest } = await import('../../../../app/composables/useAccountEventPageRequest')
    const request = useAccountEventPageRequest('fixture-event', 'operations')

    expect(toValue(request.requestKey)).toBe('account-event-page:fixture-event:operations')
    expect(toValue(request.path)).toBe('/api/account/events/fixture-event/operations')
    expect(request.authorizationGeneration.value).toBe(3)
    expect(capturedOptions).toMatchObject({
      cacheScope: 'protected',
      dedupe: 'cancel',
      immediate: true
    })

    const apiFetch = vi.fn(async (path: string, options: { signal: AbortSignal }) => {
      expect(path).toBe('/api/account/events/fixture-event/operations')
      expect(options.signal).toBeInstanceOf(AbortSignal)
      return {
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
      }
    })
    const signal = new AbortController().signal

    await expect(capturedHandler!({ apiFetch, signal })).resolves.toMatchObject({
      page: { phase: 'submission_open' }
    })
    expect(sessionEnsureLoaded).toHaveBeenCalledOnce()
    expect(apiFetch).toHaveBeenCalledOnce()
  })

  test('aborts the previous active-tab signal and rejects its stale response', async () => {
    const { useAccountEventPageRequest } = await import('../../../../app/composables/useAccountEventPageRequest')
    useAccountEventPageRequest('fixture-event', 'entry')

    let resolveFirst: ((value: unknown) => void) | undefined
    let firstFetchSignal: AbortSignal | undefined
    const firstResponse = new Promise((resolve) => {
      resolveFirst = resolve
    })
    const apiFetch = vi.fn(async (_path: string, options: { signal: AbortSignal }) => {
      firstFetchSignal = options.signal
      return await firstResponse
    })
    const firstRequestSignal = new AbortController().signal
    const firstRequest = capturedHandler!({
      apiFetch,
      signal: firstRequestSignal
    })

    await Promise.resolve()
    const secondRequestSignal = new AbortController().signal
    const secondRequest = capturedHandler!({
      apiFetch: vi.fn(async () => ({ data: { page: { phase: 'new' } } })),
      signal: secondRequestSignal
    })

    expect(activeControllers.get('account-event-page')?.signal.aborted).toBe(false)
    expect(firstFetchSignal?.aborted).toBe(true)
    resolveFirst!({ data: { page: { phase: 'stale' } } })

    await expect(firstRequest).rejects.toMatchObject({ name: 'AbortError' })
    await expect(secondRequest).resolves.toEqual({ page: { phase: 'new' } })
  })
})
