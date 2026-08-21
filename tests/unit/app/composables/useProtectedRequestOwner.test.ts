import { describe, expect, test, vi } from 'vitest'

import { createProtectedRequestOwner } from '../../../../app/composables/useProtectedRequestOwner'

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
  test('shares one active read and retains a successful settlement', async () => {
    const owner = createProtectedRequestOwner()
    const response = deferred<string>()
    const load = vi.fn(async () => await response.promise)

    const first = owner.execute('protected-key', new AbortController().signal, load)
    const second = owner.execute('protected-key', new AbortController().signal, load)

    await Promise.resolve()
    expect(load).toHaveBeenCalledOnce()

    response.resolve('ready')
    await expect(first).resolves.toBe('ready')
    await expect(second).resolves.toBe('ready')

    await expect(owner.execute(
      'protected-key',
      new AbortController().signal,
      load
    )).resolves.toBe('ready')
    expect(load).toHaveBeenCalledOnce()
  })

  test('retains a terminal 4xx settlement until explicit invalidation', async () => {
    const owner = createProtectedRequestOwner()
    const businessError = { statusCode: 409, message: 'Feedback is not available.' }
    const load = vi.fn()
      .mockRejectedValueOnce(businessError)
      .mockResolvedValueOnce('refreshed')

    await expect(owner.execute(
      'feedback-key',
      new AbortController().signal,
      load
    )).rejects.toBe(businessError)
    await expect(owner.execute(
      'feedback-key',
      new AbortController().signal,
      load
    )).rejects.toBe(businessError)
    expect(load).toHaveBeenCalledOnce()

    owner.invalidate('feedback-key')
    await expect(owner.execute(
      'feedback-key',
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
})
