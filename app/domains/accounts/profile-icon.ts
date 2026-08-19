export function buildProfileIconHref(
  userId: string | null | undefined,
  version: number | null | undefined,
  eventId?: string | null
) {
  const normalizedUserId = userId?.trim()
  const normalizedVersion = typeof version === 'number' && Number.isInteger(version) && version > 0
    ? String(version)
    : ''
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
