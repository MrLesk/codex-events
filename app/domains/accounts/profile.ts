export type AccountSocialProfileUrlKey = 'xProfileUrl' | 'linkedinProfileUrl' | 'githubProfileUrl'

const urlSchemePattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:/
const openAiOrgIdPattern = /^(org_|org-)[A-Za-z0-9_-]+$/

const socialProfileAllowedDomains = {
  xProfileUrl: ['x.com', 'twitter.com'],
  linkedinProfileUrl: ['linkedin.com'],
  githubProfileUrl: ['github.com']
} as const

function isHostnameAllowed(hostname: string, allowedDomains: readonly string[]) {
  const normalizedHostname = hostname.toLowerCase()

  return allowedDomains.some(domain =>
    normalizedHostname === domain || normalizedHostname.endsWith(`.${domain}`)
  )
}

export function normalizeAccountProfileUrl(value: string | null | undefined) {
  const normalized = value?.trim() ?? ''

  if (!normalized) {
    return ''
  }

  if (urlSchemePattern.test(normalized) || normalized.startsWith('//')) {
    return normalized
  }

  return `https://${normalized}`
}

export function isAccountProfileUrlValid(value: string | null | undefined) {
  const normalized = normalizeAccountProfileUrl(value)

  if (!normalized) {
    return true
  }

  try {
    const parsed = new URL(normalized)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function isAccountSocialProfileUrlValid(
  key: AccountSocialProfileUrlKey,
  value: string | null | undefined
) {
  const normalized = normalizeAccountProfileUrl(value)

  if (!normalized) {
    return true
  }

  if (!isAccountProfileUrlValid(normalized)) {
    return false
  }

  const parsed = new URL(normalized)
  return isHostnameAllowed(parsed.hostname, socialProfileAllowedDomains[key])
}

export function isOpenAiOrgIdFormatValid(value: string) {
  return openAiOrgIdPattern.test(value.trim())
}
