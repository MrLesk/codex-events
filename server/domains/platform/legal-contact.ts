import type { H3Event } from 'h3'

import { z } from 'zod'

import { getDatabase } from '#server/database/client'
import { getPlatformLegalSettings } from '#server/domains/platform/legal-settings'
import {
  createOutboundEmailMetadataHeaders,
  getOutboundEmailFailureReason,
  getOutboundEmailFromAddress,
  normalizeOutboundEmailError,
  outboundEmailConfigurationMissingReason,
  outboundEmailRuntimeConfigSchema,
  resolveOutboundEmailBinding,
  type OutboundEmailBindingLike,
  type OutboundEmailProviderError
} from '#server/utils/outbound-email'

export const publicLegalContactBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(1).max(4000),
  website: z.string().trim().max(500).optional().default('')
})

type LegalContactRuntimeConfig = z.infer<typeof outboundEmailRuntimeConfigSchema>

export type PublicLegalContactInput = z.infer<typeof publicLegalContactBodySchema>
export type PublicLegalContactEmailResult = {
  status: 'sent'
  messageId: string | null
} | {
  status: 'failed'
  reason: 'provider_error' | 'transport_error'
  providerError?: OutboundEmailProviderError | null
} | {
  status: 'skipped'
  reason: 'honeypot_triggered' | 'legal_settings_missing' | typeof outboundEmailConfigurationMissingReason
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function resolveRuntimeConfig(event: H3Event): LegalContactRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const candidate = eventRuntimeConfig ?? useRuntimeConfig(event) ?? {}
  const parsed = outboundEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveRuntimeConfigFromUnknown(candidate: unknown): LegalContactRuntimeConfig {
  const parsed = outboundEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function buildLegalContactEmailContent(input: PublicLegalContactInput) {
  const escapedName = escapeHtml(input.name)
  const escapedEmail = escapeHtml(input.email)
  const escapedMessage = escapeHtml(input.message).replaceAll('\n', '<br />')

  return {
    subject: `Codex Events contact request from ${input.name}`,
    text: [
      'A new message was submitted through the Codex Events imprint contact form.',
      '',
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      '',
      'Message:',
      input.message
    ].join('\n'),
    html: [
      '<p>A new message was submitted through the Codex Events imprint contact form.</p>',
      `<p><strong>Name:</strong> ${escapedName}<br /><strong>Email:</strong> ${escapedEmail}</p>`,
      `<p><strong>Message:</strong><br />${escapedMessage}</p>`
    ].join('\n')
  }
}

export async function sendPublicLegalContactEmail(
  event: H3Event,
  input: PublicLegalContactInput,
  options?: {
    emailBinding?: OutboundEmailBindingLike
    cloudflareEnv?: Record<string, unknown>
    runtimeConfig?: unknown
    supportEmail?: string | null
  }
): Promise<PublicLegalContactEmailResult> {
  if (input.website?.trim()) {
    return {
      status: 'skipped',
      reason: 'honeypot_triggered'
    }
  }

  const runtimeConfig = options?.runtimeConfig
    ? resolveRuntimeConfigFromUnknown(options.runtimeConfig)
    : resolveRuntimeConfig(event)
  const fromAddress = getOutboundEmailFromAddress(runtimeConfig)
  const { binding } = resolveOutboundEmailBinding({
    event,
    runtimeConfig,
    cloudflareEnv: options?.cloudflareEnv,
    emailBinding: options?.emailBinding
  })

  if (!binding || !fromAddress) {
    return {
      status: 'skipped',
      reason: outboundEmailConfigurationMissingReason
    }
  }

  const supportEmail = options?.supportEmail
    ?? (await getPlatformLegalSettings(getDatabase(event)))?.supportEmail
    ?? null

  if (!supportEmail) {
    return {
      status: 'skipped',
      reason: 'legal_settings_missing'
    }
  }

  const content = buildLegalContactEmailContent(input)
  const emailKey = `legal-contact:${input.email}:${input.name}:${input.message.length}`
  let response: Awaited<ReturnType<OutboundEmailBindingLike['send']>>

  try {
    response = await binding.send({
      from: fromAddress,
      to: supportEmail,
      replyTo: input.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      headers: createOutboundEmailMetadataHeaders({
        notificationType: 'legal_contact',
        idempotencyKey: emailKey
      })
    })
  } catch (error) {
    return {
      status: 'failed',
      reason: getOutboundEmailFailureReason(error),
      providerError: normalizeOutboundEmailError(error)
    }
  }

  return {
    status: 'sent',
    messageId: response.messageId ?? null
  }
}
