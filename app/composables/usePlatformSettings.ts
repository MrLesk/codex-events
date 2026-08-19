export interface PlatformSettingsRecord {
  id: string
  defaultEventBackgroundImageUrl: string | null
  createdAt: string
  updatedAt: string
}

export function usePlatformSettings() {
  const request = useApiResponse<PlatformSettingsRecord | null>(
    'current-platform-settings',
    '/api/platform-settings/current',
    {
      cacheScope: 'public',
      default: () => null
    }
  )

  return {
    ...request,
    settings: computed(() => request.data.value ?? null)
  }
}
