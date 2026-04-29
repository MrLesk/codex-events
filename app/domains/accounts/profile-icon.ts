export function buildProfileIconHref(
  userId: string | null | undefined,
  version: string | null | undefined,
  hackathonId?: string | null
) {
  const normalizedUserId = userId?.trim()
  const normalizedVersion = version?.trim()
  const normalizedHackathonId = hackathonId?.trim()

  if (!normalizedUserId || !normalizedVersion) {
    return undefined
  }

  const searchParams = new URLSearchParams({
    user: normalizedUserId,
    v: normalizedVersion
  })

  if (normalizedHackathonId) {
    searchParams.set('hackathon', normalizedHackathonId)
  }

  return `/api/account/profile-icon?${searchParams.toString()}`
}
