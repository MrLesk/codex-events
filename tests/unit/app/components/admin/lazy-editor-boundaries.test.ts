import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const editorFieldSource = readFileSync(
  new URL('../../../../../app/components/admin/AdminMarkdownEditorField.vue', import.meta.url),
  'utf8'
)
const editorClientSource = readFileSync(
  new URL('../../../../../app/components/admin/AdminMarkdownEditorClient.client.vue', import.meta.url),
  'utf8'
)
const settingsPanelSource = readFileSync(
  new URL('../../../../../app/components/account/events/AccountEventAdminSettingsPanel.vue', import.meta.url),
  'utf8'
)
const builderPageSource = readFileSync(
  new URL('../../../../../app/pages/admin/events/builder/[eventId].vue', import.meta.url),
  'utf8'
)

describe('local editor and sortable loading boundaries', () => {
  test('keeps the markdown editor local and behind ClientOnly/lazy loading', () => {
    expect(editorFieldSource).toContain('<ClientOnly>')
    expect(editorFieldSource).toContain('<LazyAdminMarkdownEditorClient')
    expect(editorClientSource).toContain('from \'md-editor-v3\'')
    expect(editorClientSource).toContain('\'md-editor-v3/lib/style.css\'')
    expect(editorFieldSource).not.toContain('unpkg')
    expect(editorClientSource).not.toContain('unpkg')
  })

  test('loads sortable only through the local interaction boundary', () => {
    expect(settingsPanelSource).toContain('await import(\'sortablejs\')')
    expect(settingsPanelSource).toContain('onBeforeUnmount')
    expect(settingsPanelSource).toContain('settingsRequest.abort()')
    expect(settingsPanelSource).toContain('useAccountEventPageRequest<AccountEventSettingsPage>')
    expect(settingsPanelSource).not.toContain('useAdminEventSettingsWorkspace')
    expect(settingsPanelSource).not.toContain('workspace.refreshWorkspace')
    expect(builderPageSource).toContain('useAccountEventPageRequest<AccountEventSettingsPage>')
    expect(builderPageSource).not.toContain('useApiResponse')
    expect(builderPageSource).not.toContain('/terms/current')
    expect(builderPageSource).toContain('settingsRequest.abort()')
    expect(settingsPanelSource).not.toContain('unpkg')
  })
})
