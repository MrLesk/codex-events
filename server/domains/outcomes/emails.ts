import type { H3Event } from 'h3'

import { z } from 'zod'

import {
  createOutboundEmailMetadataHeaders,
  getOutboundEmailFailureReason,
  getOutboundEmailFromAddress,
  getOutboundEmailReplyTo,
  normalizeOutboundEmailError,
  outboundEmailConfigurationMissingReason,
  outboundEmailRuntimeConfigSchema,
  resolveOutboundEmailBinding,
  type OutboundEmailBindingLike,
  type OutboundEmailProviderError
} from '#server/utils/outbound-email'

const hackathonOutcomeEmailRuntimeConfigSchema = outboundEmailRuntimeConfigSchema.extend({
  auth0: z.object({
    appBaseUrl: z.string().trim().optional()
  }).optional()
})

const emailAddressSchema = z.string().trim().email()

type HackathonOutcomeEmailRuntimeConfig = z.infer<typeof hackathonOutcomeEmailRuntimeConfigSchema>

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
  providerError?: OutboundEmailProviderError | null
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
    emailBinding?: OutboundEmailBindingLike
    cloudflareEnv?: Record<string, unknown>
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

  const dashboardUrl = resolveHackathonDashboardUrl(runtimeConfig, input.hackathonSlug)
  const content = buildHackathonOutcomeEmailContent(input, dashboardUrl)
  const replyTo = getOutboundEmailReplyTo(runtimeConfig)
  const emailKey = `hackathon-outcome:${input.notificationType}:${input.teamId}:${input.recipientUserId}:${input.announcedAt}`
  let response: Awaited<ReturnType<OutboundEmailBindingLike['send']>>

  try {
    response = await binding.send({
      from: fromAddress,
      to: parsedRecipientEmail.data,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(replyTo ? { replyTo } : {}),
      headers: createOutboundEmailMetadataHeaders({
        notificationType: content.tagValue,
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
