import 'dotenv/config'

import { mkdir, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

type CommandMode = 'apply' | 'check'

interface ScriptArgs {
  mode: CommandMode
  secretBulkPath: string | null
}

interface LumaWebhookBootstrapConfig {
  apiKey: string
  apiBaseUrl: string
  webhookUrl: string
}

interface LumaWebhookRecord {
  id: string
  url: string
  eventTypes: string[]
  status: string
  secret: string
  createdAt: string
}

interface DriftAnalysis {
  compliant: boolean
  status: 'compliant' | 'missing' | 'mismatch' | 'duplicate'
  managedWebhookId: string | null
  managedWebhookIds: string[]
  duplicateWebhookIds: string[]
  reasons: string[]
}

interface LumaWebhookApiResponse {
  code?: string
  message?: string
  entries?: unknown
  has_more?: unknown
  next_cursor?: unknown
  webhook?: unknown
}

interface ListWebhooksResponse {
  entries: LumaWebhookRecord[]
  hasMore: boolean
  nextCursor: string | null
}

interface CheckSummary {
  mode: 'check'
  compliant: boolean
  webhookUrl: string
  managedWebhookId: string | null
  managedWebhookIds: string[]
  duplicateWebhookIds: string[]
  reasons: string[]
  driftStatus: DriftAnalysis['status']
}

interface ApplySummary {
  mode: 'apply'
  compliant: true
  webhookUrl: string
  managedWebhookId: string
  actions: string[]
  secretBulkPathWritten: string | null
}

const desiredWebhookEventTypes = ['guest.updated'] as const
const desiredWebhookStatus = 'active'
const defaultLumaApiBaseUrl = 'https://public-api.luma.com'

export function getUsageMessage() {
  return `Usage: bun tools/luma/webhook-bootstrap.ts <apply|check> [--secret-bulk-path <path>]

Environment variables:
- LUMA_API_KEY (fallback: NUXT_LUMA_API_KEY)
- LUMA_API_BASE_URL (fallback: NUXT_LUMA_API_BASE_URL; default: ${defaultLumaApiBaseUrl})
- LUMA_WEBHOOK_URL (fallback: <NUXT_AUTH0_APP_BASE_URL>/api/public/luma/webhooks when https)
`
}

export function parseCommandMode(argument: string | undefined): CommandMode {
  if (argument === 'apply' || argument === 'check') {
    return argument
  }

  throw new Error(getUsageMessage())
}

export function parseScriptArgs(argv: string[]): ScriptArgs {
  const mode = parseCommandMode(argv[0])
  let secretBulkPath: string | null = null

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    const nextToken = argv[index + 1]

    if (token === '--secret-bulk-path') {
      if (!nextToken?.trim()) {
        throw new Error('Missing value for --secret-bulk-path.')
      }

      secretBulkPath = nextToken.trim()
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${token}\n\n${getUsageMessage()}`)
  }

  return {
    mode,
    secretBulkPath
  }
}

function normalizeUrlString(value: string) {
  const url = new URL(value)
  return `${url.origin}${url.pathname.replace(/\/$/, '')}${url.search}${url.hash}`
}

function normalizeHttpsUrlString(value: string, name: string) {
  const normalized = normalizeUrlString(value)

  if (!normalized.startsWith('https://')) {
    throw new Error(`${name} must be an https URL.`)
  }

  return normalized
}

function normalizeOptionalUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? normalizeUrlString(trimmed) : ''
}

function normalizeOptionalHttpsUrl(value: string | undefined, name: string) {
  const trimmed = value?.trim() ?? ''
  return trimmed ? normalizeHttpsUrlString(trimmed, name) : ''
}

function normalizeEventTypes(eventTypes: readonly string[]) {
  return [...new Set(eventTypes.map(eventType => eventType.trim()).filter(Boolean))].sort()
}

function sortWebhookRecords(records: readonly LumaWebhookRecord[]) {
  return [...records].sort((left, right) => {
    const leftCreatedAt = left.createdAt || ''
    const rightCreatedAt = right.createdAt || ''

    if (leftCreatedAt === rightCreatedAt) {
      return left.id.localeCompare(right.id)
    }

    return leftCreatedAt.localeCompare(rightCreatedAt)
  })
}

function readWebhookUrlFromAppBaseUrl(value: string | undefined) {
  const trimmed = value?.trim() ?? ''

  if (!trimmed) {
    return ''
  }

  const normalizedAppBaseUrl = normalizeUrlString(trimmed)

  if (!normalizedAppBaseUrl.startsWith('https://')) {
    return ''
  }

  return `${normalizedAppBaseUrl}/api/public/luma/webhooks`
}

export function resolveConfig(environment: NodeJS.ProcessEnv = process.env): LumaWebhookBootstrapConfig {
  const apiKey = environment.LUMA_API_KEY?.trim() || environment.NUXT_LUMA_API_KEY?.trim() || ''

  if (!apiKey) {
    throw new Error('LUMA_API_KEY or NUXT_LUMA_API_KEY is required.')
  }

  const apiBaseUrl = normalizeOptionalUrl(environment.LUMA_API_BASE_URL)
    || normalizeOptionalUrl(environment.NUXT_LUMA_API_BASE_URL)
    || defaultLumaApiBaseUrl
  const webhookUrl = normalizeOptionalHttpsUrl(environment.LUMA_WEBHOOK_URL, 'LUMA_WEBHOOK_URL')
    || readWebhookUrlFromAppBaseUrl(environment.NUXT_AUTH0_APP_BASE_URL)

  if (!webhookUrl) {
    throw new Error(
      'LUMA_WEBHOOK_URL is required unless NUXT_AUTH0_APP_BASE_URL is configured as an https URL.'
    )
  }

  return {
    apiKey,
    apiBaseUrl,
    webhookUrl
  }
}

function parseWebhookRecord(candidate: unknown, context: string): LumaWebhookRecord {
  if (!candidate || typeof candidate !== 'object') {
    throw new Error(`${context} did not contain a webhook object.`)
  }

  const rawRecord = candidate as Record<string, unknown>
  const idCandidate = rawRecord.api_id ?? rawRecord.id
  const urlCandidate = rawRecord.url
  const statusCandidate = rawRecord.status
  const secretCandidate = rawRecord.secret
  const eventTypesCandidate = rawRecord.event_types
  const createdAtCandidate = rawRecord.created_at

  if (typeof idCandidate !== 'string' || !idCandidate.trim()) {
    throw new Error(`${context} did not contain a webhook id.`)
  }

  if (typeof urlCandidate !== 'string' || !urlCandidate.trim()) {
    throw new Error(`${context} did not contain a webhook url.`)
  }

  if (!Array.isArray(eventTypesCandidate) || eventTypesCandidate.some(eventType => typeof eventType !== 'string')) {
    throw new Error(`${context} did not contain valid webhook event types.`)
  }

  if (typeof statusCandidate !== 'string' || !statusCandidate.trim()) {
    throw new Error(`${context} did not contain a webhook status.`)
  }

  if (typeof secretCandidate !== 'string' || !secretCandidate.trim()) {
    throw new Error(`${context} did not contain a webhook secret.`)
  }

  return {
    id: idCandidate.trim(),
    url: normalizeUrlString(urlCandidate),
    eventTypes: normalizeEventTypes(eventTypesCandidate),
    status: statusCandidate.trim(),
    secret: secretCandidate.trim(),
    createdAt: typeof createdAtCandidate === 'string' ? createdAtCandidate.trim() : ''
  }
}

function parseWebhookListResponse(response: unknown, context: string): ListWebhooksResponse {
  if (!response || typeof response !== 'object') {
    throw new Error(`${context} did not return a JSON object.`)
  }

  const payload = response as LumaWebhookApiResponse

  if (!Array.isArray(payload.entries)) {
    throw new Error(`${context} did not contain an entries array.`)
  }

  return {
    entries: payload.entries.map((entry, index) => parseWebhookRecord(entry, `${context} entry ${index + 1}`)),
    hasMore: payload.has_more === true,
    nextCursor: typeof payload.next_cursor === 'string' && payload.next_cursor.trim()
      ? payload.next_cursor.trim()
      : null
  }
}

function parseWebhookEnvelope(response: unknown, context: string) {
  if (!response || typeof response !== 'object') {
    throw new Error(`${context} did not return a JSON object.`)
  }

  const payload = response as LumaWebhookApiResponse
  return parseWebhookRecord(payload.webhook, `${context} webhook`)
}

async function parseResponseJson(response: Response) {
  const text = await response.text()

  if (!text.trim()) {
    return {}
  }

  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(`Luma response from ${response.url} was not valid JSON.`)
  }
}

async function requestLumaJson(
  config: LumaWebhookBootstrapConfig,
  path: string,
  options: {
    fetchImpl?: typeof fetch
    method?: 'GET' | 'POST'
    body?: Record<string, unknown>
  } = {}
) {
  const fetchImpl = options.fetchImpl ?? globalThis.fetch
  const response = await fetchImpl(new URL(path, config.apiBaseUrl), {
    method: options.method ?? 'GET',
    headers: {
      'content-type': 'application/json',
      'x-luma-api-key': config.apiKey
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  })
  const parsed = await parseResponseJson(response)

  if (!response.ok) {
    const errorPayload = parsed && typeof parsed === 'object'
      ? parsed as { code?: unknown, message?: unknown }
      : {}
    const errorCode = typeof errorPayload.code === 'string' && errorPayload.code.trim()
      ? errorPayload.code.trim()
      : 'luma_request_failed'
    const errorMessage = typeof errorPayload.message === 'string' && errorPayload.message.trim()
      ? errorPayload.message.trim()
      : `${response.status} ${response.statusText}`.trim()

    throw new Error(`Luma request failed for ${path}: ${errorCode}: ${errorMessage}`)
  }

  return parsed
}

async function listAllWebhooks(
  config: LumaWebhookBootstrapConfig,
  fetchImpl?: typeof fetch
) {
  const entries: LumaWebhookRecord[] = []
  let cursor: string | null = null

  while (true) {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''
    const response = await requestLumaJson(config, `/v1/webhooks/list${query}`, {
      fetchImpl
    })
    const parsed = parseWebhookListResponse(response, 'GET /v1/webhooks/list')
    entries.push(...parsed.entries)

    if (!parsed.hasMore) {
      break
    }

    if (!parsed.nextCursor) {
      throw new Error('Luma webhooks list returned has_more=true without next_cursor.')
    }

    cursor = parsed.nextCursor
  }

  return sortWebhookRecords(entries)
}

function isWebhookCompliant(record: LumaWebhookRecord) {
  return record.status === desiredWebhookStatus
    && JSON.stringify(record.eventTypes) === JSON.stringify(normalizeEventTypes(desiredWebhookEventTypes))
}

export function analyzeWebhookDrift(
  webhooks: readonly LumaWebhookRecord[],
  webhookUrl: string
): DriftAnalysis {
  const matchingWebhooks = sortWebhookRecords(webhooks.filter(webhook => webhook.url === webhookUrl))
  const managedWebhookIds = matchingWebhooks.map(webhook => webhook.id)

  if (matchingWebhooks.length === 0) {
    return {
      compliant: false,
      status: 'missing',
      managedWebhookId: null,
      managedWebhookIds,
      duplicateWebhookIds: [],
      reasons: ['managed_webhook_missing']
    }
  }

  const primaryWebhook = matchingWebhooks[0]!
  const duplicateWebhookIds = matchingWebhooks.slice(1).map(webhook => webhook.id)
  const reasons = []

  if (!isWebhookCompliant(primaryWebhook)) {
    reasons.push('managed_webhook_configuration_mismatch')
  }

  if (duplicateWebhookIds.length > 0) {
    reasons.push('managed_webhook_duplicate_urls')
  }

  return {
    compliant: reasons.length === 0,
    status: duplicateWebhookIds.length > 0
      ? 'duplicate'
      : reasons.length > 0
        ? 'mismatch'
        : 'compliant',
    managedWebhookId: primaryWebhook.id,
    managedWebhookIds,
    duplicateWebhookIds,
    reasons
  }
}

async function createWebhook(
  config: LumaWebhookBootstrapConfig,
  fetchImpl?: typeof fetch
) {
  const response = await requestLumaJson(config, '/v1/webhooks/create', {
    fetchImpl,
    method: 'POST',
    body: {
      url: config.webhookUrl,
      event_types: desiredWebhookEventTypes
    }
  })

  return parseWebhookEnvelope(response, 'POST /v1/webhooks/create')
}

async function updateWebhook(
  config: LumaWebhookBootstrapConfig,
  webhookId: string,
  fetchImpl?: typeof fetch
) {
  const response = await requestLumaJson(config, '/v1/webhooks/update', {
    fetchImpl,
    method: 'POST',
    body: {
      id: webhookId,
      url: config.webhookUrl,
      event_types: desiredWebhookEventTypes,
      status: desiredWebhookStatus
    }
  })

  return parseWebhookEnvelope(response, 'POST /v1/webhooks/update')
}

async function getWebhook(
  config: LumaWebhookBootstrapConfig,
  webhookId: string,
  fetchImpl?: typeof fetch
) {
  const response = await requestLumaJson(config, `/v1/webhooks/get?id=${encodeURIComponent(webhookId)}`, {
    fetchImpl
  })

  return parseWebhookEnvelope(response, 'GET /v1/webhooks/get')
}

async function deleteWebhook(
  config: LumaWebhookBootstrapConfig,
  webhookId: string,
  fetchImpl?: typeof fetch
) {
  await requestLumaJson(config, '/v1/webhooks/delete', {
    fetchImpl,
    method: 'POST',
    body: {
      id: webhookId
    }
  })
}

async function writeSecretBulkFile(secretBulkPath: string, secret: string) {
  await mkdir(dirname(secretBulkPath), { recursive: true })
  await writeFile(secretBulkPath, JSON.stringify({
    NUXT_LUMA_WEBHOOK_SECRET: secret
  }, null, 2))
}

export async function checkManagedWebhookState(
  config: LumaWebhookBootstrapConfig,
  options: {
    fetchImpl?: typeof fetch
  } = {}
): Promise<CheckSummary> {
  const webhooks = await listAllWebhooks(config, options.fetchImpl)
  const drift = analyzeWebhookDrift(webhooks, config.webhookUrl)

  return {
    mode: 'check',
    compliant: drift.compliant,
    webhookUrl: config.webhookUrl,
    managedWebhookId: drift.managedWebhookId,
    managedWebhookIds: drift.managedWebhookIds,
    duplicateWebhookIds: drift.duplicateWebhookIds,
    reasons: drift.reasons,
    driftStatus: drift.status
  }
}

export async function applyManagedWebhookState(
  config: LumaWebhookBootstrapConfig,
  options: {
    fetchImpl?: typeof fetch
    secretBulkPath?: string | null
  } = {}
): Promise<ApplySummary> {
  const fetchImpl = options.fetchImpl
  const webhooks = await listAllWebhooks(config, fetchImpl)
  const matchingWebhooks = sortWebhookRecords(webhooks.filter(webhook => webhook.url === config.webhookUrl))
  const actions: string[] = []
  let managedWebhook: LumaWebhookRecord

  if (matchingWebhooks.length === 0) {
    managedWebhook = await createWebhook(config, fetchImpl)
    actions.push('create')
  } else {
    managedWebhook = matchingWebhooks[0]!

    if (!isWebhookCompliant(managedWebhook)) {
      managedWebhook = await updateWebhook(config, managedWebhook.id, fetchImpl)
      actions.push('update')
    }

    for (const duplicateWebhook of matchingWebhooks.slice(1)) {
      await deleteWebhook(config, duplicateWebhook.id, fetchImpl)
      actions.push(`delete_duplicate:${duplicateWebhook.id}`)
    }
  }

  managedWebhook = await getWebhook(config, managedWebhook.id, fetchImpl)

  if (!managedWebhook.secret.trim()) {
    throw new Error(`Managed webhook ${managedWebhook.id} did not return a webhook secret.`)
  }

  if (options.secretBulkPath) {
    await writeSecretBulkFile(options.secretBulkPath, managedWebhook.secret)
  }

  return {
    mode: 'apply',
    compliant: true,
    webhookUrl: config.webhookUrl,
    managedWebhookId: managedWebhook.id,
    actions,
    secretBulkPathWritten: options.secretBulkPath ?? null
  }
}

export async function run(
  args = process.argv.slice(2),
  environment: NodeJS.ProcessEnv = process.env
) {
  const scriptArgs = parseScriptArgs(args)
  const config = resolveConfig(environment)

  if (scriptArgs.mode === 'check') {
    const summary = await checkManagedWebhookState(config)
    console.info(JSON.stringify(summary, null, 2))

    if (!summary.compliant) {
      process.exitCode = 1
    }

    return
  }

  const summary = await applyManagedWebhookState(config, {
    secretBulkPath: scriptArgs.secretBulkPath
  })
  console.info(JSON.stringify(summary, null, 2))
}

if (import.meta.main) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  })
}
