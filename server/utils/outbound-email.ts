import type { H3Event } from 'h3'

import { z } from 'zod'

export const defaultOutboundEmailBinding = 'EMAIL'
export const outboundEmailConfigurationMissingReason = 'outbound_email_configuration_missing'

const outboundEmailSettingsSchema = z.object({
  binding: z.string().trim().optional(),
  fromEmail: z.string().trim().optional(),
  fromName: z.string().trim().optional(),
  replyTo: z.string().trim().optional()
}).optional()

export const outboundEmailRuntimeConfigSchema = z.object({
  outboundEmail: outboundEmailSettingsSchema
})

export type OutboundEmailRuntimeConfig = z.infer<typeof outboundEmailRuntimeConfigSchema>

export interface OutboundEmailAddress {
  email: string
  name: string
}

export interface OutboundEmailMessage {
  to: string | string[]
  from: string | OutboundEmailAddress
  subject: string
  html?: string
  text?: string
  replyTo?: string | OutboundEmailAddress
  headers?: Record<string, string>
}

export interface OutboundEmailBindingLike {
  send: (message: OutboundEmailMessage) => Promise<{
    messageId?: string | null
  }>
}

export interface OutboundEmailProviderError {
  name: string
  statusCode: number | null
  message: string
}

export function resolveOutboundEmailRuntimeConfig(event: H3Event): OutboundEmailRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = outboundEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

export function resolveOutboundEmailRuntimeConfigFromUnknown(candidate: unknown): OutboundEmailRuntimeConfig {
  const parsed = outboundEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

export function getOutboundEmailBindingName(runtimeConfig: OutboundEmailRuntimeConfig) {
  return runtimeConfig.outboundEmail?.binding?.trim() || defaultOutboundEmailBinding
}

export function getOutboundEmailFromAddress(runtimeConfig: OutboundEmailRuntimeConfig) {
  const fromEmail = runtimeConfig.outboundEmail?.fromEmail?.trim()
  const fromName = runtimeConfig.outboundEmail?.fromName?.trim()

  if (!fromEmail) {
    return null
  }

  return fromName
    ? { email: fromEmail, name: fromName }
    : fromEmail
}

export function getOutboundEmailReplyTo(runtimeConfig: OutboundEmailRuntimeConfig) {
  return runtimeConfig.outboundEmail?.replyTo?.trim() || null
}

function isOutboundEmailBindingLike(value: unknown): value is OutboundEmailBindingLike {
  if (!value || typeof value !== 'object') {
    return false
  }

  const candidate = value as Partial<OutboundEmailBindingLike>
  return typeof candidate.send === 'function'
}

export function resolveOutboundEmailBinding(options: {
  event?: H3Event
  runtimeConfig: OutboundEmailRuntimeConfig
  cloudflareEnv?: Record<string, unknown>
  emailBinding?: OutboundEmailBindingLike
}) {
  const bindingName = getOutboundEmailBindingName(options.runtimeConfig)

  if (options.emailBinding) {
    return {
      binding: options.emailBinding,
      bindingName
    }
  }

  const cloudflareEnv = options.cloudflareEnv
    ?? (options.event?.context.cloudflare?.env as Record<string, unknown> | undefined)
  const bindingCandidate = cloudflareEnv?.[bindingName]

  return {
    binding: isOutboundEmailBindingLike(bindingCandidate) ? bindingCandidate : null,
    bindingName
  }
}

export function createOutboundEmailMetadataHeaders(options: {
  notificationType: string
  idempotencyKey: string
}) {
  return {
    'X-Codex-Notification-Type': options.notificationType,
    'X-Codex-Email-Key': options.idempotencyKey
  }
}

function getErrorCode(error: unknown) {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return null
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string' && code.trim().length > 0 ? code.trim() : null
}

function getErrorStatusCode(code: string | null) {
  switch (code) {
    case 'E_RATE_LIMIT_EXCEEDED':
      return 429
    case 'E_INTERNAL_SERVER_ERROR':
      return 500
    default:
      return null
  }
}

export function getOutboundEmailFailureReason(error: unknown) {
  return getErrorCode(error)?.startsWith('E_') ? 'provider_error' : 'transport_error'
}

export function normalizeOutboundEmailError(error: unknown): OutboundEmailProviderError {
  const code = getErrorCode(error)

  return {
    name: code ?? 'application_error',
    statusCode: getErrorStatusCode(code),
    message: error instanceof Error ? error.message : 'Unexpected email transport error'
  }
}

export function isRetryableOutboundEmailProviderError(providerError: OutboundEmailProviderError | null | undefined) {
  const providerName = providerError?.name ?? ''
  const statusCode = providerError?.statusCode ?? null

  return providerName === 'application_error'
    || providerName === 'E_RATE_LIMIT_EXCEEDED'
    || providerName === 'E_INTERNAL_SERVER_ERROR'
    || (statusCode !== null && statusCode >= 500)
}
