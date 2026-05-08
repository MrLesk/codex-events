export const eventProgramSettingsModes = [
  'full',
  'settings',
  'details'
] as const

export type EventProgramSettingsMode = (typeof eventProgramSettingsModes)[number]

export interface EventConfigFormModeView {
  showBasicInformationFields: boolean
  showAgendaItemsSection: boolean
  showProgramIdentitySection: boolean
  showProgramSettingsSections: boolean
  basicsHeading: string
  basicsDescription: string
  programIdentityDescription: string
}

export interface EventProgramSettingsCopy {
  submitLabel: string
  helperText: string
  successTitle: string
  successDescription: string
}

export function getEventConfigFormModeView(
  mode: EventProgramSettingsMode = 'full'
): EventConfigFormModeView {
  if (mode === 'details') {
    return {
      showBasicInformationFields: false,
      showAgendaItemsSection: true,
      showProgramIdentitySection: true,
      showProgramSettingsSections: false,
      basicsHeading: 'Schedule',
      basicsDescription: 'Set the schedule participants see in the Details tab. Drag items or use the arrow controls to reorder them.',
      programIdentityDescription: 'Update the location and imagery shown in the public Details tab.'
    }
  }

  if (mode === 'settings') {
    return {
      showBasicInformationFields: true,
      showAgendaItemsSection: false,
      showProgramIdentitySection: false,
      showProgramSettingsSections: true,
      basicsHeading: 'Basic Information',
      basicsDescription: 'Edit name, slug, and description.',
      programIdentityDescription: ''
    }
  }

  return {
    showBasicInformationFields: true,
    showAgendaItemsSection: true,
    showProgramIdentitySection: true,
    showProgramSettingsSections: true,
    basicsHeading: 'Basic Information',
    basicsDescription: 'Set the public basics for this event: name, slug, description, and agenda.',
    programIdentityDescription: 'Update the location and imagery shown in the public Details tab.'
  }
}

export function getEventProgramSettingsCopy(
  mode: EventProgramSettingsMode = 'settings'
): EventProgramSettingsCopy {
  if (mode === 'details') {
    return {
      submitLabel: 'Save Details',
      helperText: 'Changes here update the public Details tab participants see, including the schedule, location, and imagery.',
      successTitle: 'Details updated',
      successDescription: 'The public Details tab now shows the latest schedule, location, and imagery.'
    }
  }

  return {
    submitLabel: 'Save Configuration',
    helperText: 'Save changes.',
    successTitle: 'Configuration saved',
    successDescription: 'Event settings now match the latest admin updates.'
  }
}
