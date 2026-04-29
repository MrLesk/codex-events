import { describe, expect, test, vi } from 'vitest'

import {
  createHackathonCreditOfferWithInventory,
  isHackathonCreditLink,
  normalizeHackathonCreditApiError
} from '../../../../../app/domains/credits'

describe('hackathon credit helpers', () => {
  function createOfferFixture() {
    return {
      id: 'credit_offer_1',
      hackathonId: 'hackathon_1',
      name: 'OpenAI credits',
      description: 'Redeem the code on the provider site.',
      displayOrder: 1,
      createdAt: '2026-04-10T12:00:00.000Z',
      updatedAt: '2026-04-10T12:00:00.000Z',
      availableCount: 0,
      claimedCount: 0,
      totalCount: 0,
      codes: []
    }
  }

  test('identifies http and https credit values as links', () => {
    expect(isHackathonCreditLink('https://redeem.example/token')).toBe(true)
    expect(isHackathonCreditLink('http://redeem.example/token')).toBe(true)
    expect(isHackathonCreditLink('CODE-123')).toBe(false)
    expect(isHackathonCreditLink('ftp://redeem.example/token')).toBe(false)
  })

  test('creates an offer without importing inventory when no file is provided', async () => {
    const offer = createOfferFixture()
    const apiFetch = vi.fn().mockResolvedValue({
      data: offer
    })

    const result = await createHackathonCreditOfferWithInventory({
      apiFetch,
      hackathonId: 'hackathon_1',
      name: 'OpenAI credits',
      description: 'Redeem the code on the provider site.'
    })

    expect(apiFetch).toHaveBeenCalledTimes(1)
    expect(apiFetch).toHaveBeenCalledWith('/api/hackathons/hackathon_1/credits', {
      method: 'POST',
      body: {
        name: 'OpenAI credits',
        description: 'Redeem the code on the provider site.'
      }
    })
    expect(result).toEqual({
      status: 'created',
      offer,
      importedCount: 0
    })
  })

  test('creates an offer and imports the initial CSV inventory when a file is provided', async () => {
    const offer = createOfferFixture()
    const file = new File(['CODE-1\nCODE-2'], 'credits.csv', {
      type: 'text/csv'
    })
    const apiFetch = vi.fn()
      .mockResolvedValueOnce({
        data: offer
      })
      .mockResolvedValueOnce({
        data: {
          importedCount: 2
        }
      })

    const result = await createHackathonCreditOfferWithInventory({
      apiFetch,
      hackathonId: 'hackathon_1',
      name: 'OpenAI credits',
      description: 'Redeem the code on the provider site.',
      file
    })

    expect(apiFetch).toHaveBeenCalledTimes(2)
    expect(apiFetch).toHaveBeenNthCalledWith(2, '/api/hackathons/hackathon_1/credits/credit_offer_1/import', {
      method: 'POST',
      body: expect.any(FormData)
    })

    const formData = apiFetch.mock.calls[1]?.[1]?.body as FormData
    expect(formData.get('file')).toBeInstanceOf(File)
    expect(result).toEqual({
      status: 'created',
      offer,
      importedCount: 2
    })
  })

  test('returns a partial-success result when the offer is created but the initial CSV import fails', async () => {
    const offer = createOfferFixture()
    const file = new File(['CODE-1'], 'credits.csv', {
      type: 'text/csv'
    })
    const apiFetch = vi.fn()
      .mockResolvedValueOnce({
        data: offer
      })
      .mockRejectedValueOnce({
        data: {
          error: {
            code: 'hackathon_credit_import_empty',
            message: 'The uploaded CSV did not contain any credit values.'
          }
        }
      })

    const result = await createHackathonCreditOfferWithInventory({
      apiFetch,
      hackathonId: 'hackathon_1',
      name: 'OpenAI credits',
      description: 'Redeem the code on the provider site.',
      file
    })

    expect(result).toEqual({
      status: 'created_without_inventory',
      offer,
      importError: {
        code: 'hackathon_credit_import_empty',
        message: 'The uploaded CSV did not contain any credit values.'
      }
    })
  })

  test('normalizes structured and unstructured API errors', () => {
    expect(normalizeHackathonCreditApiError({
      data: {
        error: {
          code: 'hackathon_credit_sold_out',
          message: 'No credits remain for this offer.'
        }
      }
    })).toEqual({
      code: 'hackathon_credit_sold_out',
      message: 'No credits remain for this offer.'
    })

    expect(normalizeHackathonCreditApiError(new Error('Request failed'))).toEqual({
      code: 'request_failed',
      message: 'Request failed'
    })
  })
})
