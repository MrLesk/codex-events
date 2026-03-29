function isHttpUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function parseProofOfExecutionLinks(value: string | null | undefined) {
  if (typeof value !== 'string') {
    return []
  }

  return value
    .split(',')
    .map(link => link.trim())
    .filter(link => link.length > 0)
}

export function isProofOfExecutionLinksValid(value: string | null | undefined) {
  return parseProofOfExecutionLinks(value).every(isHttpUrl)
}

export function normalizeProofOfExecutionLinks(value: string | null | undefined) {
  return parseProofOfExecutionLinks(value).join(', ')
}
