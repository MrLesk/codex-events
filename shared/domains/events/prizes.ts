export interface EventPrizeReward {
  rewardValue: string
  rewardCurrency: string | null
}

export interface EventPrizeAward extends EventPrizeReward {
  name: string
}

const prizeNumberFormatter = new Intl.NumberFormat(undefined, {
  maximumFractionDigits: 20
})

function parseNumericPrizeRewardValue(value: string) {
  if (!/^-?\d+(?:\.\d+)?$/.test(value)) {
    return null
  }

  const numericValue = Number(value)

  return Number.isFinite(numericValue) ? numericValue : null
}

export function formatPrizeReward(prize: EventPrizeReward) {
  const numericRewardValue = parseNumericPrizeRewardValue(prize.rewardValue)

  if (numericRewardValue === null) {
    return prize.rewardValue
  }

  if (!prize.rewardCurrency) {
    return prizeNumberFormatter.format(numericRewardValue)
  }

  const currency = prize.rewardCurrency.toUpperCase()

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 20
    }).format(numericRewardValue)
  } catch {
    return `${prizeNumberFormatter.format(numericRewardValue)} ${currency}`
  }
}

export function formatPrizeAwardLabel(prize: EventPrizeAward) {
  return `${prize.name} (${formatPrizeReward(prize)})`
}
