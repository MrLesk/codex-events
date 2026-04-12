export type CountdownPostTargetState = 'waiting' | 'expired'
export type CountdownPhase = 'counting_down' | CountdownPostTargetState
export type CountdownTarget = string | number | Date | null | undefined

export interface CountdownSegment {
  key: 'days' | 'hours' | 'minutes' | 'seconds'
  label: string
  singularLabel: string
  shortLabel: string
  value: number
  displayValue: string
}

export interface CountdownResolution {
  isTargetValid: boolean
  phase: CountdownPhase
  remainingMs: number
  remainingSeconds: number
  segments: CountdownSegment[]
}

const countdownSegmentDefinitions = [
  {
    key: 'days',
    label: 'Days',
    singularLabel: 'day',
    shortLabel: 'd'
  },
  {
    key: 'hours',
    label: 'Hours',
    singularLabel: 'hour',
    shortLabel: 'h'
  },
  {
    key: 'minutes',
    label: 'Minutes',
    singularLabel: 'minute',
    shortLabel: 'm'
  },
  {
    key: 'seconds',
    label: 'Seconds',
    singularLabel: 'second',
    shortLabel: 's'
  }
] as const satisfies Array<Pick<CountdownSegment, 'key' | 'label' | 'singularLabel' | 'shortLabel'>>

function padCountdownValue(value: number) {
  if (value >= 100) {
    return String(value)
  }

  return String(value).padStart(2, '0')
}

function resolveCountdownTargetTimestamp(targetAt: CountdownTarget) {
  if (targetAt instanceof Date) {
    const timestamp = targetAt.getTime()

    return Number.isNaN(timestamp) ? null : timestamp
  }

  if (typeof targetAt === 'number') {
    return Number.isFinite(targetAt) ? targetAt : null
  }

  if (typeof targetAt === 'string') {
    const timestamp = Date.parse(targetAt)

    return Number.isNaN(timestamp) ? null : timestamp
  }

  return null
}

function getCountdownParts(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1000))
  const days = Math.floor(totalSeconds / 86_400)
  const hours = Math.floor((totalSeconds % 86_400) / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  return {
    totalSeconds,
    days,
    hours,
    minutes,
    seconds
  }
}

export function getCountdownSegments(remainingMs: number): CountdownSegment[] {
  const parts = getCountdownParts(remainingMs)

  return countdownSegmentDefinitions.map((definition) => {
    const value = parts[definition.key]

    return {
      ...definition,
      value,
      displayValue: padCountdownValue(value)
    }
  })
}

export function formatCountdownCompactLabel(
  segments: CountdownSegment[],
  options: {
    includeSeconds?: boolean
    maxUnits?: number
  } = {}
) {
  const includeSeconds = options.includeSeconds ?? true
  const maxUnits = options.maxUnits ?? (includeSeconds ? 4 : 3)
  const visibleSegments = includeSeconds
    ? segments
    : segments.filter(segment => segment.key !== 'seconds')
  const nonZeroSegments = visibleSegments.filter(segment => segment.value > 0)

  if (nonZeroSegments.length === 0) {
    return includeSeconds ? '0s' : '<1m'
  }

  return nonZeroSegments
    .slice(0, maxUnits)
    .map(segment => `${segment.value}${segment.shortLabel}`)
    .join(' ')
}

export function formatCountdownAccessibleLabel(
  segments: CountdownSegment[],
  options: {
    includeSeconds?: boolean
  } = {}
) {
  const includeSeconds = options.includeSeconds ?? true
  const visibleSegments = includeSeconds
    ? segments
    : segments.filter(segment => segment.key !== 'seconds')
  const nonZeroSegments = visibleSegments.filter(segment => segment.value > 0)

  if (nonZeroSegments.length === 0) {
    return includeSeconds ? '0 seconds' : 'less than 1 minute'
  }

  return nonZeroSegments
    .map((segment) => {
      const label = segment.value === 1 ? segment.singularLabel : segment.label.toLowerCase()
      return `${segment.value} ${label}`
    })
    .join(', ')
}

export function resolveCountdownState(
  targetAt: CountdownTarget,
  options: {
    now?: Date
    postTargetState?: CountdownPostTargetState
  } = {}
): CountdownResolution {
  const targetTimestamp = resolveCountdownTargetTimestamp(targetAt)

  if (targetTimestamp === null) {
    return {
      isTargetValid: false,
      phase: options.postTargetState ?? 'expired',
      remainingMs: 0,
      remainingSeconds: 0,
      segments: getCountdownSegments(0)
    }
  }

  const nowTimestamp = options.now?.getTime() ?? Date.now()
  const remainingMs = targetTimestamp - nowTimestamp

  if (remainingMs <= 0) {
    return {
      isTargetValid: true,
      phase: options.postTargetState ?? 'expired',
      remainingMs: 0,
      remainingSeconds: 0,
      segments: getCountdownSegments(0)
    }
  }

  const segments = getCountdownSegments(remainingMs)
  const remainingSeconds = segments.reduce((total, segment) => {
    switch (segment.key) {
      case 'days':
        return total + (segment.value * 86_400)
      case 'hours':
        return total + (segment.value * 3_600)
      case 'minutes':
        return total + (segment.value * 60)
      default:
        return total + segment.value
    }
  }, 0)

  return {
    isTargetValid: true,
    phase: 'counting_down',
    remainingMs,
    remainingSeconds,
    segments
  }
}
