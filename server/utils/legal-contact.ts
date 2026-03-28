import type { H3Event } from 'h3'

import { Resend, type CreateEmailRequestOptions, type ErrorResponse } from 'resend'
import { z } from 'zod'

import { platformSupportEmail } from '../../shared/platform-legal'

export const publicLegalContactBodySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email(),
  message: z.string().trim().min(1).max(4000),
  website: z.string().trim().max(500).optional().default('')
})

type LegalContactRuntimeConfig = {
  resend?: {
    apiKey?: string
    fromEmail?: string
    fromName?: string
  }
}

type ResendClientLike = Pick<Resend, 'emails'>

export type PublicLegalContactInput = z.infer<typeof publicLegalContactBodySchema>
export type PublicLegalContactEmailResult = {
  status: 'sent'
  messageId: string | null
} | {
  status: 'failed'
  reason: 'provider_error' | 'transport_error'
  providerError?: ErrorResponse | null
} | {
  status: 'skipped'
  reason: 'honeypot_triggered' | 'resend_configuration_missing'
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
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = z.object({
    resend: z.object({
      apiKey: z.string().trim().optional(),
      fromEmail: z.string().trim().optional(),
      fromName: z.string().trim().optional()
    }).optional()
  }).safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveRuntimeConfigFromUnknown(candidate: unknown): LegalContactRuntimeConfig {
  const parsed = z.object({
    resend: z.object({
      apiKey: z.string().trim().optional(),
      fromEmail: z.string().trim().optional(),
      fromName: z.string().trim().optional()
    }).optional()
  }).safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function buildSenderAddress(runtimeConfig: LegalContactRuntimeConfig) {
  const fromEmail = runtimeConfig.resend?.fromEmail?.trim()
  const fromName = runtimeConfig.resend?.fromName?.trim()

  if (!fromEmail) {
    return null
  }

  return fromName ? `${fromName} <${fromEmail}>` : fromEmail
}

function buildLegalContactEmailContent(input: PublicLegalContactInput) {
  const escapedName = escapeHtml(input.name)
  const escapedEmail = escapeHtml(input.email)
  const escapedMessage = escapeHtml(input.message).replaceAll('\n', '<br />')

  return {
    subject: `Codex Hackathons contact request from ${input.name}`,
    text: [
      'A new message was submitted through the Codex Hackathons imprint contact form.',
      '',
      `Name: ${input.name}`,
      `Email: ${input.email}`,
      '',
      'Message:',
      input.message
    ].join('\n'),
    html: [
      '<p>A new message was submitted through the Codex Hackathons imprint contact form.</p>',
      `<p><strong>Name:</strong> ${escapedName}<br /><strong>Email:</strong> ${escapedEmail}</p>`,
      `<p><strong>Message:</strong><br />${escapedMessage}</p>`
    ].join('\n')
  }
}

export async function sendPublicLegalContactEmail(
  event: H3Event,
  input: PublicLegalContactInput,
  options?: {
    resendClient?: ResendClientLike
    runtimeConfig?: unknown
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
  const apiKey = runtimeConfig.resend?.apiKey?.trim()
  const fromAddress = buildSenderAddress(runtimeConfig)

  if (!apiKey || !fromAddress) {
    return {
      status: 'skipped',
      reason: 'resend_configuration_missing'
    }
  }

  const resendClient = options?.resendClient ?? new Resend(apiKey)
  const content = buildLegalContactEmailContent(input)
  const requestOptions: CreateEmailRequestOptions = {
    idempotencyKey: `legal-contact:${input.email}:${input.name}:${input.message.length}`
  }
  let response: Awaited<ReturnType<ResendClientLike['emails']['send']>>

  try {
    response = await resendClient.emails.send({
      from: fromAddress,
      to: [platformSupportEmail],
      replyTo: input.email,
      subject: content.subject,
      text: content.text,
      html: content.html,
      tags: [
        {
          name: 'notification_type',
          value: 'legal_contact'
        }
      ]
    }, requestOptions)
  } catch (error) {
    return {
      status: 'failed',
      reason: 'transport_error',
      providerError: {
        name: 'application_error',
        statusCode: null,
        message: error instanceof Error ? error.message : 'Unexpected email transport error'
      }
    }
  }

  if (response.error) {
    return {
      status: 'failed',
      reason: 'provider_error',
      providerError: response.error
    }
  }

  return {
    status: 'sent',
    messageId: response.data?.id ?? null
  }
}
