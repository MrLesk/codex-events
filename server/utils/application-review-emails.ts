import type { H3Event } from 'h3'

import { Resend, type ErrorResponse, type CreateEmailRequestOptions } from 'resend'
import { z } from 'zod'

export const applicationReviewDecisionValues = ['approved', 'rejected'] as const

export type ApplicationReviewDecision = typeof applicationReviewDecisionValues[number]

const applicationReviewEmailRuntimeConfigSchema = z.object({
  resend: z.object({
    apiKey: z.string().trim().optional(),
    fromEmail: z.string().trim().optional(),
    fromName: z.string().trim().optional(),
    replyTo: z.string().trim().optional()
  }).optional(),
  auth0: z.object({
    appBaseUrl: z.string().trim().optional()
  }).optional()
})

const emailAddressSchema = z.string().trim().email()

type ApplicationReviewEmailRuntimeConfig = z.infer<typeof applicationReviewEmailRuntimeConfigSchema>
type ResendClientLike = Pick<Resend, 'emails'>
export type ApplicationReviewEmailRuntimeConfigShape = ApplicationReviewEmailRuntimeConfig

export interface ApplicationReviewDecisionEmailInput {
  applicationId: string
  decision: ApplicationReviewDecision
  reviewedAt: string
  recipientEmail: string | null
  recipientDisplayName?: string | null
  hackathonName: string
  hackathonSlug: string
}

export type ApplicationReviewDecisionEmailDeliveryResult = {
  status: 'sent'
  messageId: string | null
} | {
  status: 'failed'
  reason: string
  providerError?: ErrorResponse | null
} | {
  status: 'skipped'
  reason: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#39;')
}

function resolveRuntimeConfig(event: H3Event): ApplicationReviewEmailRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = applicationReviewEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveRuntimeConfigFromUnknown(candidate: unknown): ApplicationReviewEmailRuntimeConfig {
  const parsed = applicationReviewEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveApplicationDashboardUrl(runtimeConfig: ApplicationReviewEmailRuntimeConfig, hackathonSlug: string) {
  const appBaseUrl = runtimeConfig.auth0?.appBaseUrl?.trim()

  if (!appBaseUrl) {
    return null
  }

  try {
    return new URL(`/account/hackathons/${encodeURIComponent(hackathonSlug)}`, appBaseUrl).toString()
  } catch {
    return null
  }
}

function buildSenderAddress(runtimeConfig: ApplicationReviewEmailRuntimeConfig) {
  const fromEmail = runtimeConfig.resend?.fromEmail?.trim()
  const fromName = runtimeConfig.resend?.fromName?.trim()

  if (!fromEmail) {
    return null
  }

  return fromName ? `${fromName} <${fromEmail}>` : fromEmail
}

function toPreferredFirstName(displayName: string | null | undefined) {
  const normalized = displayName?.trim()

  if (!normalized) {
    return 'there'
  }

  const [firstName = 'there'] = normalized.split(/\s+/)
  return firstName
}

function buildApplicationReviewEmailContent(input: ApplicationReviewDecisionEmailInput, dashboardUrl: string | null) {
  const firstName = toPreferredFirstName(input.recipientDisplayName)
  const escapedFirstName = escapeHtml(firstName)
  const escapedHackathonName = escapeHtml(input.hackathonName)
  const linkText = dashboardUrl
    ? `You can view your current status here: ${dashboardUrl}`
    : 'You can view your current status in your account dashboard.'
  const escapedLinkText = escapeHtml(linkText)
  const dashboardAnchor = dashboardUrl
    ? `<p><a href="${escapeHtml(dashboardUrl)}">Open your hackathon dashboard</a></p>`
    : ''

  if (input.decision === 'approved') {
    return {
      subject: `You're accepted to ${input.hackathonName}`,
      text: [
        `Hi ${firstName},`,
        '',
        `Great news - your application for ${input.hackathonName} has been approved.`,
        '',
        linkText
      ].join('\n'),
      html: [
        `<p>Hi ${escapedFirstName},</p>`,
        `<p>Great news - your application for <strong>${escapedHackathonName}</strong> has been approved.</p>`,
        `<p>${escapedLinkText}</p>`,
        dashboardAnchor
      ].join('\n')
    }
  }

  return {
    subject: `Update on your ${input.hackathonName} application`,
    text: [
      `Hi ${firstName},`,
      '',
      `Thanks for applying to ${input.hackathonName}.`,
      'Your application was not selected this time.',
      '',
      linkText
    ].join('\n'),
    html: [
      `<p>Hi ${escapedFirstName},</p>`,
      `<p>Thanks for applying to <strong>${escapedHackathonName}</strong>.</p>`,
      '<p>Your application was not selected this time.</p>',
      `<p>${escapedLinkText}</p>`,
      dashboardAnchor
    ].join('\n')
  }
}

export async function sendApplicationReviewDecisionEmail(
  event: H3Event,
  input: ApplicationReviewDecisionEmailInput,
  options?: {
    resendClient?: ResendClientLike
    runtimeConfig?: unknown
  }
): Promise<ApplicationReviewDecisionEmailDeliveryResult> {
  if (input.recipientEmail?.endsWith('@deleted.invalid')) {
    return {
      status: 'skipped',
      reason: 'recipient_account_deleted'
    }
  }

  const parsedRecipientEmail = emailAddressSchema.safeParse(input.recipientEmail)

  if (!parsedRecipientEmail.success) {
    return {
      status: 'skipped',
      reason: 'recipient_email_invalid'
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

  const dashboardUrl = resolveApplicationDashboardUrl(runtimeConfig, input.hackathonSlug)
  const content = buildApplicationReviewEmailContent(input, dashboardUrl)
  const replyTo = runtimeConfig.resend?.replyTo?.trim()
  const resendClient = options?.resendClient ?? new Resend(apiKey)
  const requestOptions: CreateEmailRequestOptions = {
    idempotencyKey: `application-review:${input.applicationId}:${input.decision}:${input.reviewedAt}`
  }
  let response: Awaited<ReturnType<ResendClientLike['emails']['send']>>

  try {
    response = await resendClient.emails.send({
      from: fromAddress,
      to: [parsedRecipientEmail.data],
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(replyTo ? { replyTo } : {}),
      tags: [
        {
          name: 'notification_type',
          value: `application_${input.decision}`
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
