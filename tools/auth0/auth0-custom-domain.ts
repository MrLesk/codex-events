import { setTimeout as sleep } from 'node:timers/promises'

interface Auth0CustomDomainVerificationMethod {
  name?: string
  record?: string
  domain?: string
}

interface Auth0CustomDomain {
  custom_domain_id: string
  domain: string
  primary: boolean
  status?: string
  verification?: {
    status?: string
    methods?: Auth0CustomDomainVerificationMethod[]
  }
  certificate?: {
    status?: string
  }
}

interface CloudflareApiError {
  message?: string
}

interface CloudflareApiEnvelope<Result> {
  success?: boolean
  errors?: CloudflareApiError[]
  result: Result
}

interface CloudflareZone {
  id: string
  name: string
}

interface CloudflareDnsRecord {
  id: string
  type: string
  name: string
  content: string
  proxied?: boolean | null
  ttl?: number
}

interface DesiredDnsRecord {
  name: string
  content: string
}

interface Auth0CustomDomainConfig {
  tenantDomain: string
  managementClientId: string
  managementClientSecret: string
  managementAudience: string
  customDomain: string
  zoneName: string
  cloudflareApiToken: string
  waitTimeoutMs: number
  pollIntervalMs: number
}

function requireEnv(name: string) {
  const value = process.env[name]?.trim()

  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`)
  }

  return value
}

function parseSecondsEnv(name: string, fallbackSeconds: number) {
  const value = process.env[name]?.trim()

  if (!value) {
    return fallbackSeconds * 1000
  }

  const parsed = Number.parseInt(value, 10)

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive integer number of seconds.`)
  }

  return parsed * 1000
}

function normalizeTenantDomain(value: string) {
  const trimmed = value.trim().replace(/\/+$/, '')

  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed
  }

  return `https://${trimmed}`
}

function normalizeHostname(value: string) {
  const trimmed = value.trim().replace(/\.+$/, '')

  if (/^https?:\/\//i.test(trimmed)) {
    return new URL(trimmed).hostname.toLowerCase()
  }

  return trimmed.toLowerCase()
}

export function resolveAuth0CustomDomain(environment: Record<string, string | undefined>) {
  const explicitDomain = environment.AUTH0_CUSTOM_DOMAIN?.trim()

  if (explicitDomain) {
    return normalizeHostname(explicitDomain)
  }

  const baseDomain = environment.BASE_DOMAIN?.trim()

  if (!baseDomain) {
    throw new Error('Missing required environment variable AUTH0_CUSTOM_DOMAIN or BASE_DOMAIN.')
  }

  return normalizeHostname(`auth.${normalizeHostname(baseDomain)}`)
}

export function resolveVerificationDnsRecord(customDomain: Auth0CustomDomain): DesiredDnsRecord {
  const verificationMethod = customDomain.verification?.methods?.find((method) => {
    const methodName = method.name?.trim().toUpperCase()

    return methodName === 'CNAME' && Boolean(method.record?.trim()) && Boolean(method.domain?.trim())
  })

  if (!verificationMethod?.domain || !verificationMethod.record) {
    throw new Error(`Auth0 custom domain ${customDomain.domain} is missing a CNAME verification method.`)
  }

  return {
    name: normalizeHostname(verificationMethod.domain),
    content: normalizeHostname(verificationMethod.record)
  }
}

export function requiresDnsUpdate(record: CloudflareDnsRecord | null, desiredRecord: DesiredDnsRecord) {
  if (!record) {
    return true
  }

  if (record.type !== 'CNAME') {
    return true
  }

  if (normalizeHostname(record.name) !== desiredRecord.name) {
    return true
  }

  if (normalizeHostname(record.content) !== desiredRecord.content) {
    return true
  }

  if (record.proxied !== false) {
    return true
  }

  return record.ttl !== 1
}

function loadConfig(): Auth0CustomDomainConfig {
  return {
    tenantDomain: normalizeTenantDomain(requireEnv('AUTH0_MANAGEMENT_DOMAIN')),
    managementClientId: requireEnv('AUTH0_MGMT_CLIENT_ID'),
    managementClientSecret: requireEnv('AUTH0_MGMT_CLIENT_SECRET'),
    managementAudience: `${normalizeTenantDomain(requireEnv('AUTH0_MANAGEMENT_DOMAIN'))}/api/v2/`,
    customDomain: resolveAuth0CustomDomain(process.env),
    zoneName: normalizeHostname(requireEnv('DEPLOY_CF_ZONE_NAME')),
    cloudflareApiToken: requireEnv('CLOUDFLARE_API_TOKEN'),
    waitTimeoutMs: parseSecondsEnv('AUTH0_CUSTOM_DOMAIN_WAIT_SECONDS', 600),
    pollIntervalMs: parseSecondsEnv('AUTH0_CUSTOM_DOMAIN_POLL_SECONDS', 15)
  }
}

async function getManagementToken(config: Auth0CustomDomainConfig) {
  const response = await fetch(`${config.tenantDomain}/oauth/token`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      client_id: config.managementClientId,
      client_secret: config.managementClientSecret,
      audience: config.managementAudience,
      grant_type: 'client_credentials'
    })
  })

  const payload = await response.json() as { access_token?: string, error_description?: string, message?: string }

  if (!response.ok || !payload.access_token) {
    throw new Error(`Failed to fetch Auth0 management token: ${payload.error_description ?? payload.message ?? response.statusText}`)
  }

  return payload.access_token
}

async function auth0Request<Result>(
  config: Auth0CustomDomainConfig,
  token: string,
  path: string,
  init: RequestInit
) {
  const response = await fetch(`${config.tenantDomain}${path}`, {
    ...init,
    headers: {
      'authorization': `Bearer ${token}`,
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  })

  const responseText = await response.text()

  if (response.ok) {
    if (!responseText) {
      return null as Result
    }

    return JSON.parse(responseText) as Result
  }

  if (
    path === '/api/v2/custom-domains'
    && init.method === 'POST'
    && response.status === 403
    && responseText.includes('verified credit card on file')
  ) {
    throw new Error(
      'Auth0 blocked custom-domain creation because the tenant does not have a verified billing method. Add billing in Auth0, then rerun the deployment workflow.'
    )
  }

  throw new Error(`Auth0 request ${init.method ?? 'GET'} ${path} failed with status ${response.status}: ${responseText}`)
}

async function listCustomDomains(config: Auth0CustomDomainConfig, token: string) {
  return await auth0Request<Auth0CustomDomain[]>(config, token, '/api/v2/custom-domains', {
    method: 'GET'
  })
}

async function ensureCustomDomainExists(config: Auth0CustomDomainConfig, token: string) {
  let customDomain = (await listCustomDomains(config, token)).find(domain => domain.domain === config.customDomain)

  if (!customDomain) {
    await auth0Request(config, token, '/api/v2/custom-domains', {
      method: 'POST',
      body: JSON.stringify({
        domain: config.customDomain,
        type: 'auth0_managed_certs',
        tls_policy: 'recommended'
      })
    })
    console.log(`Applied: created Auth0 custom domain ${config.customDomain}.`)
    customDomain = (await listCustomDomains(config, token)).find(domain => domain.domain === config.customDomain)
  }

  if (!customDomain) {
    throw new Error(`Auth0 custom domain ${config.customDomain} is still missing after creation attempt.`)
  }

  return customDomain
}

function describeCloudflareErrors(errors: CloudflareApiError[] | undefined) {
  const messages = errors?.map(error => error.message?.trim()).filter(Boolean)

  return messages && messages.length > 0 ? messages.join('; ') : 'Unknown Cloudflare API error.'
}

async function cloudflareRequest<Result>(
  config: Auth0CustomDomainConfig,
  path: string,
  init: RequestInit
) {
  const response = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
    ...init,
    headers: {
      'authorization': `Bearer ${config.cloudflareApiToken}`,
      'content-type': 'application/json',
      ...(init.headers ?? {})
    }
  })

  const payload = await response.json() as CloudflareApiEnvelope<Result>

  if (!response.ok || !payload.success) {
    throw new Error(`Cloudflare request ${init.method ?? 'GET'} ${path} failed: ${describeCloudflareErrors(payload.errors)}`)
  }

  return payload.result
}

async function resolveZone(config: Auth0CustomDomainConfig) {
  const zones = await cloudflareRequest<CloudflareZone[]>(
    config,
    `/zones?name=${encodeURIComponent(config.zoneName)}`,
    { method: 'GET' }
  )
  const matchingZone = zones.find(zone => normalizeHostname(zone.name) === config.zoneName)

  if (matchingZone) {
    return matchingZone
  }

  throw new Error(`No Cloudflare zone matched ${config.zoneName}.`)
}

async function getExistingDnsRecord(config: Auth0CustomDomainConfig, zoneId: string, recordName: string) {
  const records = await cloudflareRequest<CloudflareDnsRecord[]>(
    config,
    `/zones/${zoneId}/dns_records?name=${encodeURIComponent(recordName)}`,
    { method: 'GET' }
  )
  const matchingRecords = records.filter(record => normalizeHostname(record.name) === recordName)

  if (matchingRecords.length > 1) {
    throw new Error(`Cloudflare returned multiple DNS records for ${recordName}; resolve the conflict manually and rerun.`)
  }

  return matchingRecords[0] ?? null
}

async function ensureVerificationDnsRecord(
  config: Auth0CustomDomainConfig,
  zoneId: string,
  desiredRecord: DesiredDnsRecord
) {
  const existingRecord = await getExistingDnsRecord(config, zoneId, desiredRecord.name)

  if (!existingRecord) {
    await cloudflareRequest(
      config,
      `/zones/${zoneId}/dns_records`,
      {
        method: 'POST',
        body: JSON.stringify({
          type: 'CNAME',
          name: desiredRecord.name,
          content: desiredRecord.content,
          ttl: 1,
          proxied: false
        })
      }
    )
    console.log(`Applied: created Cloudflare DNS record ${desiredRecord.name} -> ${desiredRecord.content}.`)
    return
  }

  if (existingRecord.type !== 'CNAME') {
    throw new Error(
      `Cloudflare DNS record ${desiredRecord.name} already exists as ${existingRecord.type}. Replace it with a DNS-only CNAME to ${desiredRecord.content} and rerun.`
    )
  }

  if (!requiresDnsUpdate(existingRecord, desiredRecord)) {
    console.log(`No change: Cloudflare DNS record ${desiredRecord.name} already matches Auth0 verification.`)
    return
  }

  await cloudflareRequest(
    config,
    `/zones/${zoneId}/dns_records/${existingRecord.id}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        type: 'CNAME',
        name: desiredRecord.name,
        content: desiredRecord.content,
        ttl: 1,
        proxied: false
      })
    }
  )
  console.log(`Applied: updated Cloudflare DNS record ${desiredRecord.name} -> ${desiredRecord.content}.`)
}

function isCustomDomainReady(customDomain: Auth0CustomDomain) {
  return (
    customDomain.status === 'ready'
    && customDomain.verification?.status === 'verified'
    && customDomain.certificate?.status === 'provisioned'
  )
}

async function waitForCustomDomainReady(config: Auth0CustomDomainConfig, token: string) {
  const deadline = Date.now() + config.waitTimeoutMs

  while (Date.now() <= deadline) {
    const customDomain = (await listCustomDomains(config, token)).find(domain => domain.domain === config.customDomain)

    if (!customDomain) {
      throw new Error(`Auth0 custom domain ${config.customDomain} disappeared while waiting for readiness.`)
    }

    if (isCustomDomainReady(customDomain)) {
      console.log(`Ready: Auth0 custom domain ${config.customDomain} is verified and certificate-provisioned.`)
      return customDomain
    }

    console.log(
      `Waiting: Auth0 custom domain ${config.customDomain} status=${customDomain.status ?? 'unknown'} `
      + `verification=${customDomain.verification?.status ?? 'unknown'} `
      + `certificate=${customDomain.certificate?.status ?? 'unknown'}.`
    )

    await sleep(config.pollIntervalMs)
  }

  const finalState = (await listCustomDomains(config, token)).find(domain => domain.domain === config.customDomain)

  throw new Error(
    `Timed out waiting for Auth0 custom domain ${config.customDomain} to become ready. `
    + `Last state: status=${finalState?.status ?? 'unknown'}, `
    + `verification=${finalState?.verification?.status ?? 'unknown'}, `
    + `certificate=${finalState?.certificate?.status ?? 'unknown'}.`
  )
}

if (import.meta.main) {
  try {
    const config = loadConfig()
    const managementToken = await getManagementToken(config)
    const customDomain = await ensureCustomDomainExists(config, managementToken)
    const desiredRecord = resolveVerificationDnsRecord(customDomain)
    const zone = await resolveZone(config)

    await ensureVerificationDnsRecord(config, zone.id, desiredRecord)
    await waitForCustomDomainReady(config, managementToken)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown Auth0 custom domain error.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
