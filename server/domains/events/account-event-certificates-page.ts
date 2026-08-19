import { assertEventAdminAccess } from '#server/auth/authorization'
import { listEventApplications } from '#server/domains/applications'
import type { AccountEventCertificatesPage } from '#shared/domains/events/account-event-certificates-page'
import { accountEventCertificatesPageSchema } from '#shared/domains/events/account-event-certificates-page'
import { defineAccountEventPageRoute } from './account-event-page-contract'

const firstCertificatePageSize = 100

export const accountEventCertificatesPageRoute = defineAccountEventPageRoute({
  page: 'certificates',
  schema: accountEventCertificatesPageSchema,
  authorize: async (context) => {
    assertEventAdminAccess(context.authorization)
  },
  load: async (context): Promise<AccountEventCertificatesPage> => {
    const result = await listEventApplications(context.database, context.event.id, {
      page: 1,
      page_size: firstCertificatePageSize,
      status: 'approved'
    })
    const applications = result.data.filter(application => !application.isEventStaff)

    return {
      applications,
      pagination: {
        page: 1,
        pageSize: firstCertificatePageSize,
        total: applications.length
      }
    }
  }
})
