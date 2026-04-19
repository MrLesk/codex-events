import { describe, expect, test } from 'vitest'

import { createHackathonGalleryUploadItems } from '../../../../app/utils/hackathon-gallery'

describe('hackathon gallery utils', () => {
  test('creates compact upload items from the selected files', () => {
    const items = createHackathonGalleryUploadItems([
      { name: '  opening-shot.png  ' } as Pick<File, 'name'>,
      { name: '' } as Pick<File, 'name'>,
      { name: 'team-photo.jpg' } as Pick<File, 'name'>
    ])

    expect(items).toEqual([
      {
        id: 'hackathon-gallery-upload-0',
        name: 'opening-shot.png'
      },
      {
        id: 'hackathon-gallery-upload-1',
        name: 'Photo 2'
      },
      {
        id: 'hackathon-gallery-upload-2',
        name: 'team-photo.jpg'
      }
    ])
  })
})
