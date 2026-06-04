export function buildEventLumaWebhookPath(eventId: string) {
  return `/api/public/events/${encodeURIComponent(eventId)}/luma/webhooks`
}

function normalizeAppBaseUrl(value: string, name: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${name} is required to derive the Luma webhook URL.`)
  }

  const url = new URL(trimmed)
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`
}

export function buildEventLumaWebhookUrl(appBaseUrl: string, eventId: string, name = 'app base URL') {
  return `${normalizeAppBaseUrl(appBaseUrl, name)}${buildEventLumaWebhookPath(eventId)}`
}
