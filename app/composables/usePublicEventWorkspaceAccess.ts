import type { SessionActor } from '~/domains/accounts/session-actor'

import { useSessionActor } from '~/composables/useSessionActor'

interface AccountEventAccessRecord {
  slug: string
}

interface AccountEventsResponse {
  data: {
    current: AccountEventAccessRecord[]
    past: AccountEventAccessRecord[]
  }
}

function buildActorCacheKey(actor: SessionActor) {
  if (actor.kind !== 'platform_user') {
    return actor.kind
  }

  return `${actor.platformUser.id}:${actor.hasAcceptedCurrentPlatformDocuments ? 'accepted' : 'unaccepted'}`
}

export function usePublicEventWorkspaceAccess(slug: MaybeRefOrGetter<string>) {
  const session = useSessionActor()
  const resolvedSlug = computed(() => toValue(slug))
  const actorCacheKey = computed(() => buildActorCacheKey(session.actor.value))
  const accessRequest = useApiData<boolean>(
    () => `public-event-workspace-access:${resolvedSlug.value}:${actorCacheKey.value}`,
    async ({ apiFetch, signal }) => {
      if (session.actor.value.kind !== 'platform_user' || !session.actor.value.hasAcceptedCurrentPlatformDocuments) {
        return false
      }

      try {
        const accountEventsResponse = await apiFetch<AccountEventsResponse>('/api/account/events', {
          signal
        })
        const accessibleEvents = [
          ...accountEventsResponse.data.current,
          ...accountEventsResponse.data.past
        ]

        return accessibleEvents.some(record => record.slug === resolvedSlug.value)
      } catch {
        return false
      }
    },
    {
      default: () => false,
      server: false,
      watch: [resolvedSlug, actorCacheKey]
    }
  )

  return {
    actor: session.actor,
    hasEventWorkspaceAccess: computed(() => accessRequest.data.value)
  }
}
