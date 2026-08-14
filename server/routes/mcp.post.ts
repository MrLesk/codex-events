import { McpServer, validateHostHeader } from '@modelcontextprotocol/server'
import { createMcpHandler } from 'agents/mcp/server'
import { eq } from 'drizzle-orm'
import { defineEventHandler, getRequestHeader, setResponseHeader, setResponseStatus, toWebRequest } from 'h3'

import { loadApplicationOperationCatalog } from '#server/application/operations/catalog'
import { executeApplicationOperation } from '#server/application/operations/execute'
import { listApplicationOperationsForCapabilities } from '#server/application/operations/registry'
import type { OperationCapability } from '#server/application/operations/types'
import { resolveMcpPlatformActor, setRequestActor } from '#server/auth/actor'
import { getDatabase } from '#server/database/client'
import { eventRoleAssignments } from '#server/database/schema'
import { authenticateMcpRequest } from '#server/domains/mcp/authentication'
import {
  mcpProtectedResourceMetadataUrl,
  resolveMcpOAuthConfiguration
} from '#server/domains/mcp/oauth'
import {
  coalesceMcpTokenLastUse,
  recordMcpMutationAttempt
} from '#server/domains/mcp/tokens'
import { isApiError, toApiError } from '#server/http/api-error'
import { assertMcpRateLimit } from '#server/utils/rate-limit'

function configuredHostnames(value: string | undefined, fallback: string[]) {
  const values = value?.split(',').map(item => item.trim().toLowerCase()).filter(Boolean) ?? []
  return values.length > 0 ? values : fallback
}

function bearerCredential(authorization: string | undefined) {
  const match = /^Bearer ([^\s]+)$/u.exec(authorization ?? '')
  return match?.[1] ?? null
}

function validatedOriginHostname(origin: string | null) {
  if (!origin) return { ok: true as const, hostname: null }
  try {
    const parsed = new URL(origin)
    if ((parsed.protocol !== 'http:' && parsed.protocol !== 'https:') || parsed.origin !== origin) {
      return { ok: false as const }
    }
    return { ok: true as const, hostname: parsed.hostname.toLowerCase() }
  } catch {
    return { ok: false as const }
  }
}

function forbiddenRequestTargetResponse() {
  return Response.json({
    error: { code: 'mcp_request_target_forbidden', message: 'The MCP request target is not allowed.' }
  }, { status: 403 })
}

async function readProtocolResponse(response: Response) {
  const text = await response.clone().text()
  const serialized = response.headers.get('content-type')?.includes('text/event-stream')
    ? text.split('\n').find(line => line.startsWith('data: '))?.slice(6)
    : text
  if (!serialized) return null
  try {
    return JSON.parse(serialized) as { result?: { isError?: boolean }, error?: unknown }
  } catch {
    return null
  }
}

async function actorCapabilities(event: Parameters<typeof getDatabase>[0], userId: string, isPlatformAdmin: boolean) {
  const actor = await resolveMcpPlatformActor(event, userId)
  const capabilities = new Set<OperationCapability>(['public', 'platform_account'])
  if (!actor.hasAcceptedCurrentPlatformDocuments) return capabilities
  capabilities.add('platform_user')
  if (actor.platformUser.isEventOrganizer) capabilities.add('event_organizer')
  if (isPlatformAdmin) {
    capabilities.add('platform_admin')
    capabilities.add('event_organizer')
    capabilities.add('event_admin')
    capabilities.add('event_staff')
    capabilities.add('event_judge')
    return capabilities
  }

  const roles = await getDatabase(event).select({ role: eventRoleAssignments.role })
    .from(eventRoleAssignments)
    .where(eq(eventRoleAssignments.userId, userId))
  if (roles.some((item: { role: string }) => item.role === 'event_admin')) {
    capabilities.add('event_admin')
    capabilities.add('event_staff')
  }
  if (roles.some((item: { role: string }) => item.role === 'staff')) capabilities.add('event_staff')
  if (roles.some((item: { role: string }) => item.role === 'judge')) capabilities.add('event_judge')
  return capabilities
}

export default defineEventHandler(async (event) => {
  const request = toWebRequest(event)
  const config = useRuntimeConfig(event).mcp
  const allowedHostnames = configuredHostnames(config?.allowedHostnames, ['localhost'])
  const allowedOriginHostnames = configuredHostnames(config?.allowedOriginHostnames, ['localhost'])
  const host = validateHostHeader(request.headers.get('host'), allowedHostnames)
  const origin = validatedOriginHostname(request.headers.get('origin'))
  if (!host.ok || !origin.ok || (origin.hostname && !allowedOriginHostnames.includes(origin.hostname))) {
    return forbiddenRequestTargetResponse()
  }

  if (getRequestHeader(event, 'cookie')) {
    setResponseStatus(event, 400)
    return { error: { code: 'mcp_cookies_rejected', message: 'Cookies are not accepted by the MCP endpoint.' } }
  }

  const credential = bearerCredential(getRequestHeader(event, 'authorization'))
  const database = getDatabase(event)
  const oauthConfiguration = resolveMcpOAuthConfiguration({
    auth0Domain: useRuntimeConfig(event).auth0.domain,
    resourceUrl: config?.resourceUrl,
    requiredScopes: config?.oauthRequiredScopes
  })
  const authenticated = credential
    ? await authenticateMcpRequest(database, credential, oauthConfiguration)
    : null
  if (!authenticated) {
    if (oauthConfiguration) {
      setResponseHeader(
        event,
        'www-authenticate',
        `Bearer resource_metadata="${mcpProtectedResourceMetadataUrl(oauthConfiguration)}", scope="${oauthConfiguration.requiredScopes.join(' ')}"`
      )
    }
    setResponseStatus(event, 401)
    return { error: { code: 'invalid_mcp_credential', message: 'The MCP access credential is invalid.' } }
  }

  await assertMcpRateLimit(event, authenticated.rateLimitKey)
  const actor = await resolveMcpPlatformActor(event, authenticated.userId)
  setRequestActor(event, actor)
  if (authenticated.tokenId) await coalesceMcpTokenLastUse(database, authenticated.tokenId)
  await loadApplicationOperationCatalog()
  const capabilities = await actorCapabilities(event, actor.platformUser.id, actor.platformUser.isPlatformAdmin)
  const operations = listApplicationOperationsForCapabilities(capabilities)
  const server = new McpServer({ name: 'codex-events', version: '1.0.0' })

  for (const operation of operations) {
    server.registerTool(operation.toolName, {
      description: operation.description,
      inputSchema: operation.inputSchema,
      outputSchema: operation.outputSchema,
      annotations: operation.annotations
    }, async (input) => {
      try {
        const output = await executeApplicationOperation(event, operation, input)
        return {
          content: [{ type: 'text', text: JSON.stringify(output) }],
          structuredContent: output as Record<string, unknown>
        }
      } catch (error) {
        const apiError = toApiError(error)
        if (!isApiError(error)) {
          console.error('Unhandled MCP operation error', { toolName: operation.toolName })
        }
        const safeError = { error: { code: apiError.code, message: apiError.message, ...(apiError.details ? { details: apiError.details } : {}) } }
        return {
          isError: true,
          content: [{ type: 'text', text: JSON.stringify(safeError) }],
          structuredContent: safeError
        }
      }
    })
  }

  const handler = createMcpHandler(() => server, {
    allowedHostnames,
    allowedOriginHostnames,
    legacy: 'stateless',
    responseMode: 'json'
  })
  const payload = await request.clone().json().catch(() => null) as {
    method?: unknown
    params?: { name?: unknown }
  } | null
  const attemptedOperation = payload?.method === 'tools/call' && typeof payload.params?.name === 'string'
    ? operations.find(operation => operation.toolName === payload.params!.name)
    : undefined
  let outcome: 'succeeded' | 'failed' = 'failed'
  try {
    const response = await handler.fetch(request)
    if (attemptedOperation && !attemptedOperation.annotations.readOnlyHint) {
      const result = await readProtocolResponse(response)
      outcome = response.ok && !result?.error && result?.result?.isError !== true ? 'succeeded' : 'failed'
    }
    return response
  } finally {
    if (attemptedOperation && !attemptedOperation.annotations.readOnlyHint) {
      await recordMcpMutationAttempt(database, {
        userId: actor.platformUser.id,
        authenticationMethod: authenticated.method,
        entityType: authenticated.auditEntityType,
        entityId: authenticated.auditEntityId,
        toolName: attemptedOperation.toolName,
        outcome
      })
    }
  }
})
