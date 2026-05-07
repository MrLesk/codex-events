export interface PlatformLegalSettingsRecord {
  id: string
  operatorName: string
  operatorAddress: string
  supportEmail: string
  privacyEmail: string
  legalContactLanguages: string
  businessPurpose: string
  editorialLine: string
  imprintContent: string
  createdAt: string
  updatedAt: string
}

export function usePlatformLegalSettings() {
  const request = useApiResponse<PlatformLegalSettingsRecord | null>(
    'current-platform-legal-settings',
    '/api/platform-legal-settings/current',
    {
      default: () => null
    }
  )

  return {
    ...request,
    settings: computed(() => request.data.value ?? null)
  }
}
