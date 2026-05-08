import { describe, expect, test } from 'vitest'

import {
  getEventConfigFormModeView,
  getEventProgramSettingsCopy
} from '../../../../../app/domains/events/program-settings'

describe('event program settings mode view', () => {
  test('keeps schedule and program identity together in details mode', () => {
    expect(getEventConfigFormModeView('details')).toEqual({
      showBasicInformationFields: false,
      showAgendaItemsSection: true,
      showProgramIdentitySection: true,
      showProgramSettingsSections: false,
      basicsHeading: 'Schedule',
      basicsDescription: 'Set the schedule participants see in the Details tab. Drag items or use the arrow controls to reorder them.',
      programIdentityDescription: 'Update the location and imagery shown in the public Details tab.'
    })
  })

  test('hides program identity in settings mode', () => {
    expect(getEventConfigFormModeView('settings')).toEqual({
      showBasicInformationFields: true,
      showAgendaItemsSection: false,
      showProgramIdentitySection: false,
      showProgramSettingsSections: true,
      basicsHeading: 'Basic Information',
      basicsDescription: 'Edit name, slug, and description.',
      programIdentityDescription: ''
    })
  })
})

describe('event program settings copy', () => {
  test('explains the public details impact for details mode', () => {
    expect(getEventProgramSettingsCopy('details')).toEqual({
      submitLabel: 'Save Details',
      helperText: 'Changes here update the public Details tab participants see, including the schedule, location, and imagery.',
      successTitle: 'Details updated',
      successDescription: 'The public Details tab now shows the latest schedule, location, and imagery.'
    })
  })

  test('keeps settings copy focused on non-details configuration', () => {
    expect(getEventProgramSettingsCopy('settings')).toEqual({
      submitLabel: 'Save Configuration',
      helperText: 'Save changes.',
      successTitle: 'Configuration saved',
      successDescription: 'Event settings now match the latest admin updates.'
    })
  })
})
