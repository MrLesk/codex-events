export interface HackathonCreditOffer {
  id: string
  hackathonId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface ParticipantHackathonCreditOffer extends HackathonCreditOffer {
  availableCount: number
  totalCount: number
  claimedCode: {
    id: string
    value: string
    claimedAt: string | null
  } | null
}

export interface AdminHackathonCreditCodeRecord {
  id: string
  value: string
  claimedAt: string | null
  createdAt: string
  claimedByUser: {
    id: string
    email: string
    displayName: string
  } | null
}

export interface AdminHackathonCreditOffer extends HackathonCreditOffer {
  availableCount: number
  claimedCount: number
  totalCount: number
  codes: AdminHackathonCreditCodeRecord[]
}

export interface HackathonCreditApiListResponse<T> {
  data: T[]
  meta?: {
    total?: number
    [key: string]: unknown
  }
}

export interface HackathonCreditApiDataResponse<T> {
  data: T
}

export interface HackathonCreditApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

type HackathonCreditApiFetcher = <T>(
  request: string,
  options?: {
    method?: 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE'
      | 'get' | 'head' | 'patch' | 'post' | 'put' | 'delete' | 'connect' | 'options' | 'trace'
    body?: BodyInit | Record<string, unknown> | null
  }
) => Promise<T>

type HackathonCreditInventoryUploadFile = Blob & Partial<{
  name: string
}>

export type CreateHackathonCreditOfferWithInventoryResult
  = | {
    status: 'created'
    offer: AdminHackathonCreditOffer
    importedCount: number
  }
  | {
    status: 'created_without_inventory'
    offer: AdminHackathonCreditOffer
    importError: HackathonCreditApiErrorShape
  }

export async function createHackathonCreditOfferWithInventory(options: {
  apiFetch: HackathonCreditApiFetcher
  hackathonId: string
  name: string
  description: string
  file?: HackathonCreditInventoryUploadFile | null
}): Promise<CreateHackathonCreditOfferWithInventoryResult> {
  const createResponse = await options.apiFetch<HackathonCreditApiDataResponse<AdminHackathonCreditOffer>>(
    `/api/hackathons/${options.hackathonId}/credits`,
    {
      method: 'POST',
      body: {
        name: options.name,
        description: options.description
      }
    }
  )

  if (!options.file) {
    return {
      status: 'created',
      offer: createResponse.data,
      importedCount: 0
    }
  }

  const formData = new FormData()
  formData.append(
    'file',
    options.file,
    typeof options.file.name === 'string' && options.file.name.length > 0
      ? options.file.name
      : 'credits.csv'
  )

  try {
    const importResponse = await options.apiFetch<HackathonCreditApiDataResponse<{ importedCount: number }>>(
      `/api/hackathons/${options.hackathonId}/credits/${createResponse.data.id}/import`,
      {
        method: 'POST',
        body: formData
      }
    )

    return {
      status: 'created',
      offer: createResponse.data,
      importedCount: importResponse.data.importedCount
    }
  } catch (error) {
    return {
      status: 'created_without_inventory',
      offer: createResponse.data,
      importError: normalizeHackathonCreditApiError(error)
    }
  }
}

export function isHackathonCreditLink(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeHackathonCreditApiError(error: unknown): HackathonCreditApiErrorShape {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: {
        error?: HackathonCreditApiErrorShape
      }
      response?: {
        _data?: {
          error?: HackathonCreditApiErrorShape
        }
      }
      message?: string
      statusMessage?: string
    }

    const apiError = maybeError.data?.error ?? maybeError.response?._data?.error

    if (apiError?.code && apiError.message) {
      return apiError
    }

    if (typeof maybeError.statusMessage === 'string' && maybeError.statusMessage.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.statusMessage
      }
    }

    if (typeof maybeError.message === 'string' && maybeError.message.length > 0) {
      return {
        code: 'request_failed',
        message: maybeError.message
      }
    }
  }

  return {
    code: 'request_failed',
    message: 'The hackathon credits request could not be completed.'
  }
}
