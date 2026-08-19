import { onScopeDispose } from 'vue'

import { isAbortError } from '~/lib/request-cancellation'

export function useAbortableRequest() {
  const controllers = new Map<string, AbortController>()

  function createSignal(channel: string) {
    controllers.get(channel)?.abort()

    const controller = new AbortController()
    controllers.set(channel, controller)
    return controller.signal
  }

  function abort(channel: string) {
    controllers.get(channel)?.abort()
    controllers.delete(channel)
  }

  onScopeDispose(() => {
    for (const controller of controllers.values()) {
      controller.abort()
    }

    controllers.clear()
  })

  return {
    abort,
    createSignal,
    isAborted: isAbortError
  }
}
