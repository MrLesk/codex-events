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
