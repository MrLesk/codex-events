import { describe, expect, test, vi } from 'vitest'
import { ref } from 'vue'

import {
  buildProtectedRequestKey,
  createProtectedRequestOwner,
  resolveProtectedWatchSources
} from '../../../../app/composables/useProtectedRequestOwner'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve
    reject = promiseReject
  })

  return { promise, resolve, reject }
}

describe('createProtectedRequestOwner', () => {
  test('builds a new owner identity when a watched value changes', () => {
    const watchedValue = ref('first')
    const firstKey = buildProtectedRequestKey(
      'shared-read',
      resolveProtectedWatchSources([watchedValue])
    )

    watchedValue.value = 'second'

    expect(buildProtectedRequestKey(
      'shared-read',
      resolveProtectedWatchSources([watchedValue])
    )).not.toBe(firstKey)
  })

  test('retains the Staff candidates 2xx settlement', async () => {
    const owner = createProtectedRequestOwner()
    const response = deferred<string>()
    const load = vi.fn(async () => await response.promise)

    const first = owner.execute('staff-candidates-page-1', new AbortController().signal, load)
    const second = owner.execute('staff-candidates-page-1', new AbortController().signal, load)

    await Promise.resolve()
    expect(load).toHaveBeenCalledOnce()

    response.resolve('ready')
    await expect(first).resolves.toBe('ready')
    await expect(second).resolves.toBe('ready')

    await expect(owner.execute(
      'staff-candidates-page-1',
      new AbortController().signal,
      load
    )).resolves.toBe('ready')
    expect(load).toHaveBeenCalledOnce()
  })

  test('retains the Feedback lifecycle 409 settlement until explicit invalidation', async () => {
    const owner = createProtectedRequestOwner()
    const businessError = { statusCode: 409, message: 'Feedback is not available.' }
    const load = vi.fn()
      .mockRejectedValueOnce(businessError)
      .mockResolvedValueOnce('refreshed')

    await expect(owner.execute(
      'feedback-lifecycle',
      new AbortController().signal,
      load
    )).rejects.toBe(businessError)
    await expect(owner.execute(
      'feedback-lifecycle',
      new AbortController().signal,
      load
    )).rejects.toBe(businessError)
    expect(load).toHaveBeenCalledOnce()

    owner.invalidate('feedback-lifecycle')
    await expect(owner.execute(
      'feedback-lifecycle',
      new AbortController().signal,
      load
    )).resolves.toBe('refreshed')
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('retains transport failures until explicit invalidation', async () => {
    const owner = createProtectedRequestOwner()
    const load = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce('recovered')

    await expect(owner.execute(
      'transport-key',
      new AbortController().signal,
      load
    )).rejects.toThrow('network unavailable')
    await expect(owner.execute(
      'transport-key',
      new AbortController().signal,
      load
    )).rejects.toThrow('network unavailable')
    expect(load).toHaveBeenCalledOnce()

    owner.invalidate('transport-key')
    await expect(owner.execute(
      'transport-key',
      new AbortController().signal,
      load
    )).resolves.toBe('recovered')
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('aborts an abandoned owner and does not commit its stale result', async () => {
    const owner = createProtectedRequestOwner()
    const firstResponse = deferred<string>()
    const load = vi.fn()
      .mockImplementationOnce(async () => await firstResponse.promise)
      .mockResolvedValueOnce('current')
    const firstController = new AbortController()
    const first = owner.execute('stale-key', firstController.signal, load)

    await Promise.resolve()
    firstController.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })

    const second = owner.execute('stale-key', new AbortController().signal, load)
    firstResponse.resolve('stale')

    await expect(second).resolves.toBe('current')
    expect(load).toHaveBeenCalledTimes(2)
  })

  test('keeps the shared read alive when one subscriber is cancelled', async () => {
    const owner = createProtectedRequestOwner()
    const response = deferred<string>()
    const load = vi.fn(async () => await response.promise)
    const firstController = new AbortController()
    const first = owner.execute('shared-key', firstController.signal, load)
    const second = owner.execute('shared-key', new AbortController().signal, load)

    await Promise.resolve()
    firstController.abort()
    await expect(first).rejects.toMatchObject({ name: 'AbortError' })

    response.resolve('shared')
    await expect(second).resolves.toBe('shared')
    expect(load).toHaveBeenCalledOnce()
  })

  test('bounds inactive settled retention with deterministic LRU eviction', async () => {
    const owner = createProtectedRequestOwner({ maxSettledEntries: 2 })
    const load = vi.fn(async (value: string) => value)

    await expect(owner.execute('first', new AbortController().signal, () => load('first'))).resolves.toBe('first')
    await expect(owner.execute('second', new AbortController().signal, () => load('second'))).resolves.toBe('second')
    await expect(owner.execute('second', new AbortController().signal, () => load('second'))).resolves.toBe('second')
    await expect(owner.execute('third', new AbortController().signal, () => load('third'))).resolves.toBe('third')
    await expect(owner.execute('first', new AbortController().signal, () => load('first'))).resolves.toBe('first')

    expect(load.mock.calls.map(([value]) => value)).toEqual(['first', 'second', 'third', 'first'])
  })

  test('does not evict or abort active subscribers during capacity trimming', async () => {
    const owner = createProtectedRequestOwner({ maxSettledEntries: 0 })
    const activeResponse = deferred<string>()
    const activeLoad = vi.fn(async (signal: AbortSignal) => {
      expect(signal.aborted).toBe(false)
      return await activeResponse.promise
    })
    const activeFirst = owner.execute('active', new AbortController().signal, activeLoad)

    await Promise.resolve()
    await expect(owner.execute('settled-one', new AbortController().signal, async () => 'one')).resolves.toBe('one')
    await expect(owner.execute('settled-two', new AbortController().signal, async () => 'two')).resolves.toBe('two')

    const activeSecond = owner.execute('active', new AbortController().signal, activeLoad)
    expect(activeLoad).toHaveBeenCalledOnce()
    activeResponse.resolve('active')

    await expect(activeFirst).resolves.toBe('active')
    await expect(activeSecond).resolves.toBe('active')
  })
})
