export function createAbortError() {
  return new DOMException('The request was aborted.', 'AbortError')
}

export function throwIfAborted(signal: AbortSignal) {
  if (signal.aborted) {
    throw createAbortError()
  }
}

export function isAbortError(error: unknown, signal?: AbortSignal) {
  return signal?.aborted === true
    || (typeof error === 'object'
      && error !== null
      && 'name' in error
      && (error as { name?: unknown }).name === 'AbortError')
}
