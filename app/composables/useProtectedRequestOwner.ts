import { isAbortError } from '~/lib/request-cancellation'

interface ProtectedRequestEntry<T> {
  controller: AbortController
  promise: Promise<T>
  settled: boolean
  subscribers: Set<symbol>
}

export interface ProtectedRequestExecuteOptions {
  force?: boolean
}

export interface ProtectedRequestOwner {
  execute<T>(
    key: string,
    signal: AbortSignal | undefined,
    load: (signal: AbortSignal) => Promise<T>,
    options?: ProtectedRequestExecuteOptions
  ): Promise<T>
  invalidate(key: string): void
}

function isSettledError(error: unknown, signal: AbortSignal) {
  // A non-abort outcome is a settlement. Transport failures are retained too:
  // a lifecycle, watcher, or remount must not turn a failed protected read
  // into an implicit retry. Explicit refresh/invalidation owns retry intent.
  return !isAbortError(error, signal)
}

export function createProtectedRequestOwner(): ProtectedRequestOwner {
  const entries = new Map<string, ProtectedRequestEntry<unknown>>()

  function abortEntry(key: string, entry: ProtectedRequestEntry<unknown>) {
    if (entries.get(key) !== entry) {
      return
    }

    entries.delete(key)
    entry.controller.abort()
  }

  function start<T>(key: string, load: (signal: AbortSignal) => Promise<T>) {
    const controller = new AbortController()
    const entry = {
      controller,
      promise: undefined as unknown as Promise<T>,
      settled: false,
      subscribers: new Set<symbol>()
    }
    entry.promise = Promise.resolve()
      .then(() => load(controller.signal))
      .then(
        (value) => {
          if (entries.get(key) === entry) {
            entry.settled = true
          }

          return value
        },
        (error) => {
          if (entries.get(key) === entry) {
            if (isSettledError(error, controller.signal)) {
              entry.settled = true
            } else {
              entries.delete(key)
            }
          }

          throw error
        }
      )

    entries.set(key, entry)

    return entry
  }

  function subscribe<T>(
    key: string,
    entry: ProtectedRequestEntry<T>,
    signal: AbortSignal | undefined
  ) {
    const subscriber = Symbol(key)

    return new Promise<T>((resolve, reject) => {
      let completed = false

      const cleanup = () => {
        signal?.removeEventListener('abort', onAbort)
        entry.subscribers.delete(subscriber)
      }
      const onAbort = () => {
        if (completed) {
          return
        }

        completed = true
        cleanup()

        if (!entry.settled && entry.subscribers.size === 0) {
          abortEntry(key, entry)
        }

        reject(new DOMException('The request was aborted.', 'AbortError'))
      }

      entry.subscribers.add(subscriber)

      if (signal?.aborted) {
        onAbort()
        return
      }

      signal?.addEventListener('abort', onAbort, { once: true })
      void entry.promise.then(
        (value) => {
          if (completed) {
            return
          }

          completed = true
          cleanup()
          resolve(value)
        },
        (error) => {
          if (completed) {
            return
          }

          completed = true
          cleanup()
          reject(error)
        }
      )
    })
  }

  return {
    execute<T>(
      key: string,
      signal: AbortSignal | undefined,
      load: (signal: AbortSignal) => Promise<T>,
      options?: ProtectedRequestExecuteOptions
    ) {
      let entry = entries.get(key) as ProtectedRequestEntry<T> | undefined

      if (options?.force && entry) {
        abortEntry(key, entry)
        entry = undefined
      }

      if (!entry) {
        entry = start(key, load)
      }

      return subscribe(key, entry, signal)
    },

    invalidate(key) {
      const entry = entries.get(key)

      if (!entry) {
        return
      }

      abortEntry(key, entry)
    }
  }
}

const protectedRequestOwners = new WeakMap<object, ProtectedRequestOwner>()

export function useProtectedRequestOwner() {
  const nuxtApp = useNuxtApp()
  const existing = protectedRequestOwners.get(nuxtApp)

  if (existing) {
    return existing
  }

  const owner = createProtectedRequestOwner()
  protectedRequestOwners.set(nuxtApp, owner)
  return owner
}
