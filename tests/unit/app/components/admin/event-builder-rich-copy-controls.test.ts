import { readFileSync } from 'node:fs'

import { describe, expect, test } from 'vitest'

const basicsFormSource = readFileSync(
  new URL('../../../../../app/components/admin/builder/organisms/AdminBuilderBasicsForm.vue', import.meta.url),
  'utf8'
)
const settingsBoardSource = readFileSync(
  new URL('../../../../../app/components/admin/builder/organisms/AdminBuilderSettingsBoard.vue', import.meta.url),
  'utf8'
)

describe('event builder rich copy controls', () => {
  test('uses the established Markdown editor for the public event description', () => {
    expect(basicsFormSource).toContain('import AdminMarkdownEditorField from \'~/components/admin/AdminMarkdownEditorField.vue\'')
    expect(basicsFormSource).toContain('<AdminMarkdownEditorField\n        v-model="form.description"')
    expect(basicsFormSource).toContain('editor-id="event-builder-description"')
    expect(basicsFormSource).toContain('required')
    expect(basicsFormSource).not.toContain('<AppTextarea\n        id="event-builder-description"')
  })

  test('uses the same Markdown editor for every track short description', () => {
    expect(settingsBoardSource).toContain('<AdminMarkdownEditorField\n                v-model="track.shortDescription"')
    expect(settingsBoardSource).toContain(':editor-id="`event-builder-track-short-${track.id}`"')
    expect(settingsBoardSource).toContain(':data-testid="`event-builder-track-short-${track.id}`"')
    expect(settingsBoardSource).toContain('v-model="track.fullDescription"')
    expect(settingsBoardSource).toContain('v-model="track.staffInstructions"')
    expect(settingsBoardSource).not.toContain('<AppInput\n                  v-model="track.shortDescription"')
  })

  test('uses the established country choices and retains the current value as an option', () => {
    expect(basicsFormSource).toContain('import { getCountryOptions } from \'~/utils/country-options\'')
    expect(basicsFormSource).toContain('getCountryOptions(form.value.country)')
    expect(basicsFormSource).toContain('<AppSelect\n            id="event-builder-country"')
    expect(basicsFormSource).toContain('v-for="option in countryOptions"')
    expect(basicsFormSource).not.toContain('<AppInput\n            id="event-builder-country"')
  })
})
