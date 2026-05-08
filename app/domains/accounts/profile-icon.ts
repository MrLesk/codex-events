export function buildProfileIconHref(
  userId: string | null | undefined,
  version: string | null | undefined,
  eventId?: string | null
) {
  const normalizedUserId = userId?.trim()
  const normalizedVersion = version?.trim()
  const normalizedEventId = eventId?.trim()

  if (!normalizedUserId || !normalizedVersion) {
    return undefined
  }

  const searchParams = new URLSearchParams({
    user: normalizedUserId,
    v: normalizedVersion
  })

  if (normalizedEventId) {
    searchParams.set('event', normalizedEventId)
  }

  return `/api/account/profile-icon?${searchParams.toString()}`
}
