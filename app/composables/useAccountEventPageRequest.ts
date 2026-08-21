import type { MultiWatchSources } from 'vue'

import type { ApiDataResponse } from '~/lib/api'
import { throwIfAborted } from '~/lib/request-cancellation'
import {
  buildAccountEventPageCacheKey,
  buildAccountEventPagePath,
  buildAccountJudgeAssignmentWorkspacePath,
  normalizeAccountEventPageQuery,
  type AccountEventPageName,
  type AccountEventPageQuery,
  type AccountEventPageResponse
} from '~/domains/events/account-workspace-page'

import { useAbortableRequest } from './useAbortableRequest'
import { useApiData } from './useApiData'
import { useAuthorizationCache } from './useAuthorizationCache'
import { useSessionActor } from './useSessionActor'

function areAccountEventPageQueriesEqual(
  left: AccountEventPageQuery | undefined,
  right: AccountEventPageQuery
) {
  return left?.selectedTeamSlug === right.selectedTeamSlug
    && left?.includeAdminEventConfiguration === right.includeAdminEventConfiguration
    && left?.includeEventShell === right.includeEventShell
}

export interface UseAccountEventPageRequestOptions<TPage> {
  default?: () => AccountEventPageResponse<TPage>
  immediate?: boolean
  query?: MaybeRefOrGetter<AccountEventPageQuery | null | undefined>
  watch?: MultiWatchSources
}

function linkAbortSignals(...signals: AbortSignal[]) {
  const controller = new AbortController()
  const abort = () => controller.abort()

  if (signals.some(signal => signal.aborted)) {
    controller.abort()
    return {
      signal: controller.signal,
      dispose: () => undefined
    }
  }

  for (const signal of signals) {
    signal.addEventListener('abort', abort, { once: true })
  }

  return {
    signal: controller.signal,
    dispose: () => {
      for (const signal of signals) {
        signal.removeEventListener('abort', abort)
      }
    }
  }
}

interface UseProtectedAccountEventRequestOptions<TData> {
  channel: string
  default?: () => TData
  enabled?: MaybeRefOrGetter<boolean>
  immediate?: boolean
  watch?: MultiWatchSources
}

function useProtectedAccountEventRequest<TData>(
  requestKey: MaybeRefOrGetter<string>,
  path: MaybeRefOrGetter<string>,
  options: UseProtectedAccountEventRequestOptions<TData>
) {
  const session = useSessionActor()
  const requests = useAbortableRequest()
  const enabled = computed(() => options.enabled === undefined
    ? true
    : Boolean(toValue(options.enabled)))
  const request = useApiData<TData>(
    requestKey,
    async ({ apiFetch, signal }) => {
      throwIfAborted(signal)

      if (!enabled.value) {
        return options.default?.() as TData
      }

      const pageSignal = requests.createSignal(options.channel)
      const linkedSignal = linkAbortSignals(signal, pageSignal)

      try {
        throwIfAborted(pageSignal)
        await session.ensureLoaded()
        throwIfAborted(signal)
        throwIfAborted(pageSignal)

        const response = await apiFetch<ApiDataResponse<TData>>(
          toValue(path),
          { signal: linkedSignal.signal }
        )

        throwIfAborted(signal)
        throwIfAborted(pageSignal)
        return response.data
      } finally {
        linkedSignal.dispose()
      }
    },
    {
      cacheScope: 'protected',
      default: options.default,
      dedupe: 'cancel',
      immediate: options.immediate ?? true,
      server: false,
      watch: [enabled, ...(options.watch ?? [])]
    }
  )

  return {
    request,
    session,
    abort: () => requests.abort(options.channel)
  }
}

export function useAccountEventPageRequest<TPage>(
  slug: MaybeRefOrGetter<string>,
  page: MaybeRefOrGetter<AccountEventPageName>,
  options: UseAccountEventPageRequestOptions<TPage> = {}
) {
  const authorizationCache = useAuthorizationCache()
  const resolvedSlug = computed(() => toValue(slug))
  const resolvedPage = computed(() => toValue(page))
  const resolvedQuery = computed<AccountEventPageQuery>((previous) => {
    const next = normalizeAccountEventPageQuery(toValue(options.query))

    if (previous && areAccountEventPageQueriesEqual(previous, next)) {
      return previous
    }

    return next
  })
  const requestKey = computed(() => buildAccountEventPageCacheKey(
    resolvedSlug.value,
    resolvedPage.value,
    resolvedQuery.value
  ))
  const path = computed(() => buildAccountEventPagePath(
    resolvedSlug.value,
    resolvedPage.value,
    resolvedQuery.value
  ))

  const protectedRequest = useProtectedAccountEventRequest<AccountEventPageResponse<TPage>>(
    requestKey,
    path,
    {
      channel: 'account-event-page',
      default: options.default,
      immediate: options.immediate,
      watch: [resolvedSlug, resolvedPage, resolvedQuery, ...(options.watch ?? [])]
    }
  )
  const pageRequest = protectedRequest.request

  return {
    actor: protectedRequest.session.actor,
    authorizationGeneration: authorizationCache.authorizationGeneration,
    bootstrap: protectedRequest.session.bootstrap,
    capabilities: protectedRequest.session.capabilities,
    clear: pageRequest.clear,
    data: pageRequest.data,
    error: pageRequest.error,
    activate: pageRequest.activate,
    page: resolvedPage,
    path,
    pending: pageRequest.pending,
    query: resolvedQuery,
    refresh: pageRequest.refresh,
    requestKey,
    slug: resolvedSlug,
    status: pageRequest.status,
    abort: protectedRequest.abort
  }
}

export interface UseAccountJudgeAssignmentPageRequestOptions<TPage> {
  default?: () => TPage
  enabled?: MaybeRefOrGetter<boolean>
  immediate?: boolean
  watch?: MultiWatchSources
}

export function useAccountJudgeAssignmentPageRequest<TPage>(
  slug: MaybeRefOrGetter<string>,
  assignmentId: MaybeRefOrGetter<string>,
  options: UseAccountJudgeAssignmentPageRequestOptions<TPage> = {}
) {
  const authorizationCache = useAuthorizationCache()
  const resolvedSlug = computed(() => toValue(slug))
  const resolvedAssignmentId = computed(() => toValue(assignmentId))
  const requestKey = computed(() =>
    `account-event-judge-assignment:${resolvedSlug.value}:${resolvedAssignmentId.value}`
  )
  const path = computed(() => buildAccountJudgeAssignmentWorkspacePath(
    resolvedSlug.value,
    resolvedAssignmentId.value
  ))
  const protectedRequest = useProtectedAccountEventRequest<TPage>(
    requestKey,
    path,
    {
      channel: 'account-event-judge-assignment',
      default: options.default,
      enabled: options.enabled,
      immediate: options.immediate,
      watch: [resolvedSlug, resolvedAssignmentId, ...(options.watch ?? [])]
    }
  )
  const pageRequest = protectedRequest.request

  return {
    actor: protectedRequest.session.actor,
    authorizationGeneration: authorizationCache.authorizationGeneration,
    bootstrap: protectedRequest.session.bootstrap,
    capabilities: protectedRequest.session.capabilities,
    clear: pageRequest.clear,
    data: pageRequest.data,
    error: pageRequest.error,
    activate: pageRequest.activate,
    assignmentId: resolvedAssignmentId,
    path,
    pending: pageRequest.pending,
    refresh: pageRequest.refresh,
    requestKey,
    slug: resolvedSlug,
    status: pageRequest.status,
    abort: protectedRequest.abort
  }
}
