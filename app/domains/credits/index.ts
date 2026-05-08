export interface EventCreditOffer {
  id: string
  eventId: string
  name: string
  description: string
  displayOrder: number
  createdAt: string
  updatedAt: string
}

export interface ParticipantEventCreditOffer extends EventCreditOffer {
  availableCount: number
  totalCount: number
  claimedCode: {
    id: string
    value: string
    claimedAt: string | null
  } | null
}

export interface AdminEventCreditCodeRecord {
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

export interface AdminEventCreditOffer extends EventCreditOffer {
  availableCount: number
  claimedCount: number
  totalCount: number
  codes: AdminEventCreditCodeRecord[]
}

export interface EventCreditApiListResponse<T> {
  data: T[]
  meta?: {
    total?: number
    [key: string]: unknown
  }
}

export interface EventCreditApiDataResponse<T> {
  data: T
}

export interface EventCreditApiErrorShape {
  code: string
  message: string
  details?: Record<string, unknown>
}

type EventCreditApiFetcher = <T>(
  request: string,
  options?: {
    method?: 'GET' | 'HEAD' | 'PATCH' | 'POST' | 'PUT' | 'DELETE' | 'CONNECT' | 'OPTIONS' | 'TRACE'
      | 'get' | 'head' | 'patch' | 'post' | 'put' | 'delete' | 'connect' | 'options' | 'trace'
    body?: BodyInit | Record<string, unknown> | null
  }
) => Promise<T>

type EventCreditInventoryUploadFile = Blob & Partial<{
  name: string
}>

export type CreateEventCreditOfferWithInventoryResult
  = | {
    status: 'created'
    offer: AdminEventCreditOffer
    importedCount: number
  }
  | {
    status: 'created_without_inventory'
    offer: AdminEventCreditOffer
    importError: EventCreditApiErrorShape
  }

export async function createEventCreditOfferWithInventory(options: {
  apiFetch: EventCreditApiFetcher
  eventId: string
  name: string
  description: string
  file?: EventCreditInventoryUploadFile | null
}): Promise<CreateEventCreditOfferWithInventoryResult> {
  const createResponse = await options.apiFetch<EventCreditApiDataResponse<AdminEventCreditOffer>>(
    `/api/events/${options.eventId}/credits`,
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
    const importResponse = await options.apiFetch<EventCreditApiDataResponse<{ importedCount: number }>>(
      `/api/events/${options.eventId}/credits/${createResponse.data.id}/import`,
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
      importError: normalizeEventCreditApiError(error)
    }
  }
}

export function isEventCreditLink(value: string) {
  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function normalizeEventCreditApiError(error: unknown): EventCreditApiErrorShape {
  if (typeof error === 'object' && error !== null) {
    const maybeError = error as {
      data?: {
        error?: EventCreditApiErrorShape
      }
      response?: {
        _data?: {
          error?: EventCreditApiErrorShape
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
    message: 'The event credits request could not be completed.'
  }
}
