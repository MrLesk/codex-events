export interface PlatformDocumentRecord {
  id: string
  documentType: 'privacy_policy' | 'platform_terms'
  version: number
  title: string
  content: string
  publishedAt: string
  createdAt: string
}

interface CurrentPlatformDocumentsResponse {
  data: {
    privacy_policy: PlatformDocumentRecord | null
    platform_terms: PlatformDocumentRecord | null
  }
}

export function useCurrentPlatformDocuments() {
  const apiFetch = import.meta.server ? useRequestFetch() : $fetch

  const request = useAsyncData<CurrentPlatformDocumentsResponse | null>(
    'current-platform-documents',
    async () => await apiFetch<CurrentPlatformDocumentsResponse>('/api/platform-documents/current'),
    {
      default: () => null
    }
  )

  return {
    ...request,
    documents: computed(() => request.data.value?.data ?? null),
    privacyPolicyDocument: computed(() => request.data.value?.data.privacy_policy ?? null),
    platformTermsDocument: computed(() => request.data.value?.data.platform_terms ?? null)
  }
}
