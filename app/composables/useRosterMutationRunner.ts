import { normalizeApiError } from '~/lib/api'

interface RunRosterMutationOptions {
  actionKey: string
  action: () => Promise<void>
  successTitle: string
  successDescription: string
  afterSuccess?: () => Promise<void> | void
}

export function useRosterMutationRunner() {
  const toast = useToast()
  const mutationError = shallowRef('')
  const pendingActionKey = shallowRef<string | null>(null)

  async function runRosterMutation(options: RunRosterMutationOptions) {
    mutationError.value = ''
    pendingActionKey.value = options.actionKey

    try {
      await options.action()
      toast.add({
        title: options.successTitle,
        description: options.successDescription,
        color: 'success'
      })
      await options.afterSuccess?.()
    } catch (error) {
      mutationError.value = normalizeApiError(error).message
    } finally {
      pendingActionKey.value = null
    }
  }

  function isPendingAction(actionKey: string) {
    return pendingActionKey.value === actionKey
  }

  return {
    mutationError,
    pendingActionKey,
    runRosterMutation,
    isPendingAction
  }
}
