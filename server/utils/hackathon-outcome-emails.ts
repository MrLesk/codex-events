import type { H3Event } from 'h3'

import { Resend, type CreateEmailRequestOptions, type ErrorResponse } from 'resend'
import { z } from 'zod'

const hackathonOutcomeEmailRuntimeConfigSchema = z.object({
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

type HackathonOutcomeEmailRuntimeConfig = z.infer<typeof hackathonOutcomeEmailRuntimeConfigSchema>
type ResendClientLike = Pick<Resend, 'emails'>

export interface HackathonOutcomeShortlistEmailInput {
  notificationType: 'shortlist'
  hackathonId: string
  hackathonName: string
  hackathonSlug: string
  teamId: string
  teamName: string
  recipientUserId: string
  recipientEmail: string | null
  recipientDisplayName?: string | null
  announcedAt: string
}

export interface HackathonOutcomeWinnerEmailInput {
  notificationType: 'winner'
  hackathonId: string
  hackathonName: string
  hackathonSlug: string
  teamId: string
  teamName: string
  recipientUserId: string
  recipientEmail: string | null
  recipientDisplayName?: string | null
  announcedAt: string
  finalRank: number
  rankedTeamCount: number
  prizeNames: string[]
}

export type HackathonOutcomeEmailInput = HackathonOutcomeShortlistEmailInput | HackathonOutcomeWinnerEmailInput

export type HackathonOutcomeEmailDeliveryResult = {
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

function resolveRuntimeConfig(event: H3Event): HackathonOutcomeEmailRuntimeConfig {
  const eventRuntimeConfig = (event.context as H3Event['context'] & { runtimeConfig?: unknown }).runtimeConfig
  const runtimeConfigGetter = (globalThis as { useRuntimeConfig?: (event: H3Event) => unknown }).useRuntimeConfig
  const candidate = eventRuntimeConfig ?? runtimeConfigGetter?.(event) ?? {}
  const parsed = hackathonOutcomeEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveRuntimeConfigFromUnknown(candidate: unknown): HackathonOutcomeEmailRuntimeConfig {
  const parsed = hackathonOutcomeEmailRuntimeConfigSchema.safeParse(candidate)

  return parsed.success ? parsed.data : {}
}

function resolveHackathonDashboardUrl(runtimeConfig: HackathonOutcomeEmailRuntimeConfig, hackathonSlug: string) {
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

function buildSenderAddress(runtimeConfig: HackathonOutcomeEmailRuntimeConfig) {
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

function formatPrizeNames(prizeNames: string[]) {
  if (prizeNames.length === 0) {
    return ''
  }

  if (prizeNames.length === 1) {
    return prizeNames[0]!
  }

  if (prizeNames.length === 2) {
    return `${prizeNames[0]} and ${prizeNames[1]}`
  }

  return `${prizeNames.slice(0, -1).join(', ')}, and ${prizeNames[prizeNames.length - 1]}`
}

function buildHackathonOutcomeEmailContent(
  input: HackathonOutcomeEmailInput,
  dashboardUrl: string | null
) {
  const firstName = toPreferredFirstName(input.recipientDisplayName)
  const escapedFirstName = escapeHtml(firstName)
  const escapedHackathonName = escapeHtml(input.hackathonName)
  const escapedTeamName = escapeHtml(input.teamName)
  const linkText = dashboardUrl
    ? `You can view the latest outcome here: ${dashboardUrl}`
    : 'You can view the latest outcome in your hackathon workspace.'
  const escapedLinkText = escapeHtml(linkText)
  const dashboardAnchor = dashboardUrl
    ? `<p><a href="${escapeHtml(dashboardUrl)}">Open your hackathon workspace</a></p>`
    : ''

  if (input.notificationType === 'shortlist') {
    return {
      subject: `${input.teamName} is shortlisted for ${input.hackathonName}`,
      text: [
        `Hi ${firstName},`,
        '',
        `Great news - ${input.teamName} has been shortlisted for ${input.hackathonName}.`,
        'Your team advanced to the live pitch stage.',
        '',
        linkText
      ].join('\n'),
      html: [
        `<p>Hi ${escapedFirstName},</p>`,
        `<p>Great news - <strong>${escapedTeamName}</strong> has been shortlisted for <strong>${escapedHackathonName}</strong>.</p>`,
        '<p>Your team advanced to the live pitch stage.</p>',
        `<p>${escapedLinkText}</p>`,
        dashboardAnchor
      ].join('\n'),
      tagValue: 'hackathon_shortlist'
    }
  }

  const prizeNames = formatPrizeNames(input.prizeNames)
  const resultLine = input.finalRank > 0 && input.rankedTeamCount > 0
    ? `${input.teamName} finished #${input.finalRank} of ${input.rankedTeamCount} and won ${prizeNames}.`
    : `${input.teamName} won ${prizeNames}.`
  const escapedResultLine = escapeHtml(resultLine)

  return {
    subject: `Congratulations - ${input.teamName} won at ${input.hackathonName}`,
    text: [
      `Hi ${firstName},`,
      '',
      `Congratulations - ${resultLine}`,
      '',
      linkText
    ].join('\n'),
    html: [
      `<p>Hi ${escapedFirstName},</p>`,
      `<p>Congratulations - ${escapedResultLine}</p>`,
      `<p>${escapedLinkText}</p>`,
      dashboardAnchor
    ].join('\n'),
    tagValue: 'hackathon_winner'
  }
}

export async function sendHackathonOutcomeEmail(
  event: H3Event,
  input: HackathonOutcomeEmailInput,
  options?: {
    resendClient?: ResendClientLike
    runtimeConfig?: unknown
  }
): Promise<HackathonOutcomeEmailDeliveryResult> {
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

  const dashboardUrl = resolveHackathonDashboardUrl(runtimeConfig, input.hackathonSlug)
  const content = buildHackathonOutcomeEmailContent(input, dashboardUrl)
  const replyTo = runtimeConfig.resend?.replyTo?.trim()
  const resendClient = options?.resendClient ?? new Resend(apiKey)
  const requestOptions: CreateEmailRequestOptions = {
    idempotencyKey: `hackathon-outcome:${input.notificationType}:${input.teamId}:${input.recipientUserId}:${input.announcedAt}`
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
          value: content.tagValue
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
