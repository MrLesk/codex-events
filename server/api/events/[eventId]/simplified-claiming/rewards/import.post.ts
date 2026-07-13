import { readMultipartFormData } from 'h3'

import { requirePlatformActor } from '#server/auth/actor'
import { writeAuditLog } from '#server/database/audit-log'
import { getD1Binding, getDatabase } from '#server/database/client'
import { parseSingleColumnCreditCsv } from '#server/domains/credits'
import {
  getSimplifiedClaimingSummary,
  isHttpsCouponUrl,
  simplifiedClaimingRewardImportLimits
} from '#server/domains/credits/simplified-claiming'
import { requireEventAdmin, routeIdParamsSchema } from '#server/domains/events'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { defineApiHandler } from '#server/http/api-handler'
import { ApiError } from '#server/http/api-error'
import { apiData } from '#server/http/api-response'
import { parseValidatedParams } from '#server/http/validation'

const maxRewardRowsPerStatement = 20

export default defineApiHandler(async (h3Event) => {
  const actor = await requirePlatformActor(h3Event)
  const { eventId } = parseValidatedParams(h3Event, routeIdParamsSchema)
  const database = getDatabase(h3Event)
  const { event } = await requireEventAdmin(h3Event, eventId)

  assertGuard(event.eventType === 'meetup' && event.simplifiedClaimingEnabled, {
    statusCode: 409,
    code: 'simplified_claiming_disabled',
    message: 'Enable simplified attendee claiming before uploading reward links.'
  })

  const summary = await getSimplifiedClaimingSummary(database, event)
  assertGuard(summary.ordinaryOfferCount === 0 && summary.genericClaimCount === 0, {
    statusCode: 409,
    code: 'simplified_claiming_credit_conflict',
    message: 'Remove ordinary credit offers before uploading attendee reward links.'
  })

  const multipart = await readMultipartFormData(h3Event)
  const filePart = multipart?.find(part => part.name === 'file')

  if (!filePart?.data || filePart.data.byteLength === 0) {
    throw new ApiError({
      statusCode: 400,
      code: 'simplified_claiming_reward_file_missing',
      message: 'Upload a single-column CSV with one HTTPS reward link per row.'
    })
  }
  assertGuard(filePart.data.byteLength <= simplifiedClaimingRewardImportLimits.maxBytes, {
    statusCode: 413,
    code: 'simplified_claiming_reward_file_too_large',
    message: 'The reward-link CSV must be 2 MB or smaller.'
  })

  const parsedValues = parseSingleColumnCreditCsv(new TextDecoder().decode(filePart.data))
  assertGuard(parsedValues.length <= simplifiedClaimingRewardImportLimits.maxRows, {
    statusCode: 413,
    code: 'simplified_claiming_reward_row_limit_exceeded',
    message: `The reward-link CSV can contain at most ${simplifiedClaimingRewardImportLimits.maxRows} rows.`
  })
  assertGuard(parsedValues.every(isHttpsCouponUrl), {
    statusCode: 400,
    code: 'simplified_claiming_coupon_url_invalid',
    message: 'Every reward must be an HTTPS link.'
  })
  const values = [...new Set(parsedValues)]

  const binding = getD1Binding(h3Event)
  const offerId = crypto.randomUUID()
  const importedAtBase = Date.now()
  const statements = [binding.prepare(`
    insert or ignore into event_credit_offers (
      id, event_id, name, description, simplified_claiming_only,
      display_order, created_at, updated_at
    ) values (?, ?, 'Attendee reward', 'Private reward links for simplified attendee claiming.', true, 0, ?, ?)
  `).bind(offerId, eventId, new Date(importedAtBase).toISOString(), new Date(importedAtBase).toISOString())]

  for (let index = 0; index < values.length; index += maxRewardRowsPerStatement) {
    const chunk = values.slice(index, index + maxRewardRowsPerStatement)
    const bindings: string[] = []
    const selects = chunk.map((value, chunkIndex) => {
      const createdAt = new Date(importedAtBase + index + chunkIndex + 1).toISOString()
      bindings.push(crypto.randomUUID(), value, createdAt, eventId, value)
      return `
        select ?, offer.id, ?, ?
        from event_credit_offers offer
        where offer.event_id = ?
          and offer.simplified_claiming_only = true
          and not exists (
            select 1 from event_credit_codes existing_code
            where existing_code.credit_offer_id = offer.id
              and existing_code.value = ?
          )
      `
    })

    statements.push(binding.prepare(`
      insert into event_credit_codes (id, credit_offer_id, value, created_at)
      ${selects.join(' union all ')}
    `).bind(...bindings))
  }

  const results = await binding.batch<Record<string, never>>(statements)
  let importedCount = 0
  for (let index = 1; index < results.length; index += 1) {
    const result: { meta: { changes?: number } } = results[index]
    importedCount += Number(result.meta.changes ?? 0)
  }

  const updatedSummary = await getSimplifiedClaimingSummary(database, event)
  await writeAuditLog(database, {
    actorUserId: actor.platformUser.id,
    entityType: 'event_credit_offer',
    entityId: updatedSummary.offer!.id,
    action: 'event_credit_offer.simplified_inventory_imported',
    metadata: {
      eventId,
      importedCount,
      skippedCount: parsedValues.length - importedCount
    }
  })

  return apiData({
    importedCount,
    skippedCount: parsedValues.length - importedCount,
    totalInventoryCount: updatedSummary.totalInventoryCount,
    availableInventoryCount: updatedSummary.availableInventoryCount,
    simplifiedClaimCount: updatedSummary.simplifiedClaimCount
  })
})
