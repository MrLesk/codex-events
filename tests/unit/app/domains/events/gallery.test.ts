import { describe, expect, test } from 'vitest'

import { createEventGalleryUploadItems } from '../../../../../app/domains/events/gallery'

describe('event gallery utils', () => {
  test('creates compact upload items from the selected files', () => {
    const items = createEventGalleryUploadItems([
      { name: '  opening-shot.png  ' } as Pick<File, 'name'>,
      { name: '' } as Pick<File, 'name'>,
      { name: 'team-photo.jpg' } as Pick<File, 'name'>
    ])

    expect(items).toEqual([
      {
        id: 'event-gallery-upload-0',
        name: 'opening-shot.png'
      },
      {
        id: 'event-gallery-upload-1',
        name: 'Photo 2'
      },
      {
        id: 'event-gallery-upload-2',
        name: 'team-photo.jpg'
      }
    ])
  })
})
