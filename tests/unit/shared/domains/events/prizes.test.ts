import { describe, expect, test } from 'vitest'

import {
  formatPrizeAwardLabel,
  formatPrizeReward
} from '../../../../../shared/domains/events/prizes'

describe('event prize helpers', () => {
  test('formats currency-backed prize rewards without unnecessary decimals', () => {
    expect(formatPrizeReward({
      rewardValue: '15000',
      rewardCurrency: 'USD'
    })).toBe(new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 20
    }).format(15000))
  })

  test('formats numeric prize rewards without a currency code using Intl number formatting', () => {
    expect(formatPrizeReward({
      rewardValue: '5000',
      rewardCurrency: null
    })).toBe(new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 20
    }).format(5000))
  })

  test('keeps free-form prize reward labels unchanged', () => {
    expect(formatPrizeReward({
      rewardValue: 'Mentorship',
      rewardCurrency: null
    })).toBe('Mentorship')
  })

  test('falls back to grouped numeric output plus currency code when the currency code is not Intl-compatible', () => {
    expect(formatPrizeReward({
      rewardValue: '1200',
      rewardCurrency: 'USDT'
    })).toBe(`${new Intl.NumberFormat(undefined, {
      maximumFractionDigits: 20
    }).format(1200)} USDT`)
  })

  test('formats public award labels as concise reward labels', () => {
    expect(formatPrizeAwardLabel({
      name: '1st Place API Credits',
      rewardType: 'api_credits',
      rewardValue: '15000',
      rewardCurrency: 'USD'
    })).toBe(`${new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 20
    }).format(15000)} API Credits`)

    expect(formatPrizeAwardLabel({
      name: 'Top 5 Teams Member Benefit',
      rewardType: 'subscription',
      rewardValue: '1 year ChatGPT Pro',
      rewardCurrency: null
    })).toBe('1 year ChatGPT Pro')
  })
})
