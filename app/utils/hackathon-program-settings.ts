export const hackathonProgramSettingsModes = [
  'full',
  'settings',
  'details'
] as const

export type HackathonProgramSettingsMode = (typeof hackathonProgramSettingsModes)[number]

export interface HackathonConfigFormModeView {
  showBasicInformationFields: boolean
  showAgendaItemsSection: boolean
  showProgramIdentitySection: boolean
  showProgramSettingsSections: boolean
  basicsHeading: string
  basicsDescription: string
  programIdentityDescription: string
}

export interface HackathonProgramSettingsCopy {
  submitLabel: string
  helperText: string
  successTitle: string
  successDescription: string
}

export function getHackathonConfigFormModeView(
  mode: HackathonProgramSettingsMode = 'full'
): HackathonConfigFormModeView {
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
      basicsDescription: 'Set the public basics for this hackathon: name, slug, and description.',
      programIdentityDescription: ''
    }
  }

  return {
    showBasicInformationFields: true,
    showAgendaItemsSection: true,
    showProgramIdentitySection: true,
    showProgramSettingsSections: true,
    basicsHeading: 'Basic Information',
    basicsDescription: 'Set the public basics for this hackathon: name, slug, description, and agenda.',
    programIdentityDescription: 'Update the location and imagery shown in the public Details tab.'
  }
}

export function getHackathonProgramSettingsCopy(
  mode: HackathonProgramSettingsMode = 'settings'
): HackathonProgramSettingsCopy {
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
    helperText: 'Use Settings for the hackathon setup, timeline, and participation rules. Edit the public Details tab content from the Details tab.',
    successTitle: 'Configuration saved',
    successDescription: 'Hackathon settings now match the latest admin updates.'
  }
}
