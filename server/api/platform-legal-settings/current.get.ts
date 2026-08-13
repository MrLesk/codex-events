import { getDatabase } from '#server/database/client'
import { defineStructuredOperationApiHandler, defineStructuredRouteOperation } from '#server/application/operations/route-operation'
import { apiData } from '#server/http/api-response'
import {
  getPlatformLegalSettings,
  serializePlatformLegalSettings
} from '#server/domains/platform/legal-settings'

export const applicationOperation = defineStructuredRouteOperation({
  id: 'get.platform-legal-settings.current',
  toolName: 'get_platform-legal-settings_current',
  description: 'GET /api/platform-legal-settings/current',
  rest: { method: 'GET', path: '/api/platform-legal-settings/current' },
  input: {},
  output: 'data',
  capabilities: ['public'],
  effect: 'read'
}, async (h3Event) => {
  const settings = await getPlatformLegalSettings(getDatabase(h3Event))

  return apiData(settings ? serializePlatformLegalSettings(settings) : null)
})

export default defineStructuredOperationApiHandler(applicationOperation)
