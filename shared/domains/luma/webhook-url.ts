export const lumaWebhookPath = '/api/public/luma/webhooks'

function normalizeAppBaseUrl(value: string, name: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    throw new Error(`${name} is required to derive the Luma webhook URL.`)
  }

  const url = new URL(trimmed)
  return `${url.origin}${url.pathname.replace(/\/$/, '')}`
}

export function buildLumaWebhookUrl(appBaseUrl: string, name = 'app base URL') {
  return `${normalizeAppBaseUrl(appBaseUrl, name)}${lumaWebhookPath}`
}

export function buildHttpsLumaWebhookUrl(appBaseUrl: string, name = 'app base URL') {
  const webhookUrl = buildLumaWebhookUrl(appBaseUrl, name)

  if (!webhookUrl.startsWith('https://')) {
    throw new Error(`${name} must be an https URL to derive the Luma webhook URL.`)
  }

  return webhookUrl
}
