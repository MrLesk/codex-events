import { normalizeAuthReturnTo } from './auth-navigation'

export interface PlatformRegistrationIntent {
  privacyPolicyDocumentId: string
  platformTermsDocumentId: string
  chatgptEmail?: string | null
  openaiOrgId?: string | null
  returnTo: string
  createdAt: string
}

export interface PlatformRegistrationSessionUser {
  name?: string | null
  nickname?: string | null
  email?: string | null
}

export const platformRegistrationIntentStorageKey = 'codex.platformRegistrationIntent'
const platformRegistrationIntentMaxAgeMs = 1000 * 60 * 60 * 4

function canUseBrowserStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function isValidIntent(value: unknown): value is PlatformRegistrationIntent {
  if (!value || typeof value !== 'object') {
    return false
  }

  const intent = value as Record<string, unknown>

  return typeof intent.privacyPolicyDocumentId === 'string'
    && intent.privacyPolicyDocumentId.length > 0
    && typeof intent.platformTermsDocumentId === 'string'
    && intent.platformTermsDocumentId.length > 0
    && (intent.chatgptEmail === undefined || intent.chatgptEmail === null || typeof intent.chatgptEmail === 'string')
    && (intent.openaiOrgId === undefined || intent.openaiOrgId === null || typeof intent.openaiOrgId === 'string')
    && typeof intent.returnTo === 'string'
    && intent.returnTo.length > 0
    && typeof intent.createdAt === 'string'
    && intent.createdAt.length > 0
}

export function buildPlatformRegistrationDisplayName(sessionUser: PlatformRegistrationSessionUser) {
  const displayName = sessionUser.name?.trim()
    || sessionUser.nickname?.trim()
    || sessionUser.email?.trim()

  return displayName || 'New User'
}

export function writePlatformRegistrationIntent(intent: Omit<PlatformRegistrationIntent, 'returnTo'> & { returnTo: string }) {
  if (!canUseBrowserStorage()) {
    return
  }

  const normalizedIntent: PlatformRegistrationIntent = {
    ...intent,
    returnTo: normalizeAuthReturnTo(intent.returnTo)
  }

  window.localStorage.setItem(platformRegistrationIntentStorageKey, JSON.stringify(normalizedIntent))
}

export function readPlatformRegistrationIntent(now = Date.now()) {
  if (!canUseBrowserStorage()) {
    return null
  }

  const serializedIntent = window.localStorage.getItem(platformRegistrationIntentStorageKey)

  if (!serializedIntent) {
    return null
  }

  try {
    const parsedIntent = JSON.parse(serializedIntent) as unknown

    if (!isValidIntent(parsedIntent)) {
      clearPlatformRegistrationIntent()
      return null
    }

    const createdAt = Date.parse(parsedIntent.createdAt)

    if (Number.isNaN(createdAt) || (now - createdAt) > platformRegistrationIntentMaxAgeMs) {
      clearPlatformRegistrationIntent()
      return null
    }

    return {
      ...parsedIntent,
      returnTo: normalizeAuthReturnTo(parsedIntent.returnTo)
    }
  } catch {
    clearPlatformRegistrationIntent()
    return null
  }
}

export function clearPlatformRegistrationIntent() {
  if (!canUseBrowserStorage()) {
    return
  }

  window.localStorage.removeItem(platformRegistrationIntentStorageKey)
}
