export function buildProfileIconHref(userId: string | null | undefined, version: string | null | undefined) {
  const normalizedUserId = userId?.trim()
  const normalizedVersion = version?.trim()

  if (!normalizedUserId || !normalizedVersion) {
    return undefined
  }

  return `/api/account/profile-icon?user=${encodeURIComponent(normalizedUserId)}&v=${encodeURIComponent(normalizedVersion)}`
}
