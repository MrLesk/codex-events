export interface PlatformDocumentRecord {
  id: string
  documentType: 'privacy_policy' | 'platform_terms'
  version: number
  title: string
  content: string
  publishedAt: string
  createdAt: string
}

interface CurrentPlatformDocuments {
  privacy_policy: PlatformDocumentRecord | null
  platform_terms: PlatformDocumentRecord | null
}

export function useCurrentPlatformDocuments() {
  const request = useApiResponse<CurrentPlatformDocuments | null>(
    'current-platform-documents',
    '/api/platform-documents/current',
    {
      default: () => null
    }
  )

  return {
    ...request,
    documents: computed(() => request.data.value ?? null),
    privacyPolicyDocument: computed(() => request.data.value?.privacy_policy ?? null),
    platformTermsDocument: computed(() => request.data.value?.platform_terms ?? null)
  }
}
