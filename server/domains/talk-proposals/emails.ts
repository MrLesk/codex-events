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

const runtimeConfigSchema = outboundEmailRuntimeConfigSchema.extend({
  auth0: z.object({ appBaseUrl: z.string().trim().optional() }).optional()
})

export interface TalkProposalDecisionEmailInput {
  proposalId: string
  decision: 'accepted' | 'rejected'
  decidedAt: string
  recipientEmail: string | null
  recipientDisplayName?: string | null
  eventName: string
  eventSlug: string
  decisionMessage?: string | null
}

export type TalkProposalEmailDeliveryResult
  = | { status: 'sent', messageId: string | null }
    | { status: 'failed', reason: string, providerError?: OutboundEmailProviderError | null }
    | { status: 'skipped', reason: string }

function escapeHtml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll('\'', '&#39;')
}

export function buildTalkProposalDecisionEmailContent(
  input: TalkProposalDecisionEmailInput,
  appBaseUrl?: string | null
) {
  const firstName = input.recipientDisplayName?.trim().split(/\s+/)[0] || 'there'
  const workspaceUrl = appBaseUrl
    ? new URL(`/account/events/${encodeURIComponent(input.eventSlug)}`, appBaseUrl).toString()
    : null
  const outcome = input.decision === 'accepted' ? 'accepted' : 'not selected'
  const subject = input.decision === 'accepted'
    ? `Your Talk proposal for ${input.eventName} was accepted`
    : `Update on your Talk proposal for ${input.eventName}`
  const message = input.decisionMessage?.trim() || null
  const text = [
    `Hi ${firstName},`,
    '',
    `Your Talk proposal for ${input.eventName} was ${outcome}.`,
    ...(message ? ['', message] : []),
    '',
    workspaceUrl ? `View your Talk proposal: ${workspaceUrl}` : 'View your Talk proposal in your event workspace.'
  ].join('\n')
  const html = [
    `<p>Hi ${escapeHtml(firstName)},</p>`,
    `<p>Your Talk proposal for <strong>${escapeHtml(input.eventName)}</strong> was ${escapeHtml(outcome)}.</p>`,
    ...(message ? [`<p>${escapeHtml(message)}</p>`] : []),
    workspaceUrl ? `<p><a href="${escapeHtml(workspaceUrl)}">View your Talk proposal</a></p>` : '<p>View your Talk proposal in your event workspace.</p>'
  ].join('\n')
  return { subject, text, html, workspaceUrl }
}

export async function sendTalkProposalDecisionEmail(
  event: H3Event,
  input: TalkProposalDecisionEmailInput,
  options?: { emailBinding?: OutboundEmailBindingLike, cloudflareEnv?: Record<string, unknown>, runtimeConfig?: unknown }
): Promise<TalkProposalEmailDeliveryResult> {
  if (input.recipientEmail?.endsWith('@deleted.invalid')) return { status: 'skipped', reason: 'recipient_account_deleted' }
  const email = z.string().trim().email().safeParse(input.recipientEmail)
  if (!email.success) return { status: 'skipped', reason: 'recipient_email_invalid' }
  const parsedConfig = runtimeConfigSchema.safeParse(options?.runtimeConfig ?? {})
  const runtimeConfig = parsedConfig.success ? parsedConfig.data : {}
  const from = getOutboundEmailFromAddress(runtimeConfig)
  const { binding } = resolveOutboundEmailBinding({ event, runtimeConfig, cloudflareEnv: options?.cloudflareEnv, emailBinding: options?.emailBinding })
  if (!binding || !from) return { status: 'skipped', reason: outboundEmailConfigurationMissingReason }
  const content = buildTalkProposalDecisionEmailContent(input, runtimeConfig.auth0?.appBaseUrl)
  try {
    const response = await binding.send({
      from,
      to: email.data,
      subject: content.subject,
      text: content.text,
      html: content.html,
      ...(getOutboundEmailReplyTo(runtimeConfig) ? { replyTo: getOutboundEmailReplyTo(runtimeConfig)! } : {}),
      headers: createOutboundEmailMetadataHeaders({
        notificationType: `talk_proposal_${input.decision}`,
        idempotencyKey: `talk-proposal:${input.proposalId}:${input.decision}:${input.decidedAt}`
      })
    })
    return { status: 'sent', messageId: response.messageId ?? null }
  } catch (error) {
    return { status: 'failed', reason: getOutboundEmailFailureReason(error), providerError: normalizeOutboundEmailError(error) }
  }
}
