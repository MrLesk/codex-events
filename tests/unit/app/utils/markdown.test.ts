import { describe, expect, test } from 'vitest'

import { renderMarkdown } from '../../../../app/utils/markdown'

describe('markdown utils', () => {
  test('renders markdown without stripping headings by default', () => {
    expect(renderMarkdown('# Title\n\nBody copy')).toContain('<h1>Title</h1>')
  })

  test('can strip the leading top-level heading before rendering', () => {
    const html = renderMarkdown('# Title\n\nBody copy', {
      stripLeadingHeading: true
    })

    expect(html).not.toContain('<h1>Title</h1>')
    expect(html).toContain('<p>Body copy</p>')
  })
})
