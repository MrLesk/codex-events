import { listEventPhotoRecords } from '#server/domains/events/photos'
import type { AccountEventGalleryPage } from '#shared/domains/events/account-event-gallery-page'
import { accountEventGalleryPageSchema } from '#shared/domains/events/account-event-gallery-page'
import { assertGuard } from '#server/domains/lifecycle-guard'
import { defineAccountEventPageRoute } from './account-event-page-contract'
import { getAccountEventPageAccess } from './account-event-page-context'

export const accountEventGalleryPageRoute = defineAccountEventPageRoute({
  page: 'gallery',
  schema: accountEventGalleryPageSchema,
  authorize: async (context) => {
    if (
      context.authorization.isPlatformAdmin
      || context.authorization.explicitRole !== null
    ) {
      return
    }

    const access = await getAccountEventPageAccess(context)
    assertGuard(access.application?.status === 'approved', {
      statusCode: 403,
      code: 'event_photo_access_required',
      message: 'This operation requires approved participant access or an explicit event role.',
      details: { eventId: context.event.id }
    })
  },
  load: async (context): Promise<AccountEventGalleryPage> => ({
    photos: await listEventPhotoRecords(context.database, context.event.id)
  })
})
