import type { H3Event } from 'h3'

import { setResponseHeader } from 'h3'

type RequestTimingPhase = 'actor' | 'authorization' | 'd1' | 'serialization'

interface RequestTimingState {
  readonly startedAt: number
  readonly phases: Partial<Record<RequestTimingPhase, number>>
  databaseSession: 'first-primary' | 'bookmark' | null
}

const requestTimingByEvent = new WeakMap<H3Event, RequestTimingState>()

function now() {
  return typeof performance !== 'undefined' ? performance.now() : Date.now()
}

function getOrCreateRequestTiming(event: H3Event) {
  const existing = requestTimingByEvent.get(event)
  if (existing) {
    return existing
  }

  const timing: RequestTimingState = {
    startedAt: now(),
    phases: {},
    databaseSession: null
  }
  requestTimingByEvent.set(event, timing)
  return timing
}

export function startRequestTiming(event: H3Event) {
  return getOrCreateRequestTiming(event)
}

export async function measureRequestPhase<T>(
  event: H3Event,
  phase: RequestTimingPhase,
  operation: () => Promise<T> | T
) {
  const timing = getOrCreateRequestTiming(event)
  const startedAt = now()

  try {
    return await operation()
  } finally {
    timing.phases[phase] = (timing.phases[phase] ?? 0) + Math.max(0, now() - startedAt)
  }
}

export function recordRequestDatabaseSession(
  event: H3Event,
  sessionStart: 'first-primary' | string
) {
  const timing = getOrCreateRequestTiming(event)
  timing.databaseSession = sessionStart === 'first-primary' ? 'first-primary' : 'bookmark'
}

function formatMilliseconds(value: number) {
  return Math.max(0, value).toFixed(2)
}

export function emitRequestTiming(event: H3Event) {
  const timing = requestTimingByEvent.get(event)
  if (!timing) {
    return false
  }

  const total = Math.max(0, now() - timing.startedAt)
  const d1Description = `strong:${timing.databaseSession ?? 'unknown'}`
  const serverTiming = [
    `actor;dur=${formatMilliseconds(timing.phases.actor ?? 0)}`,
    `authorization;dur=${formatMilliseconds(timing.phases.authorization ?? 0)}`,
    `d1;dur=${formatMilliseconds(timing.phases.d1 ?? 0)};desc="${d1Description}"`,
    `serialization;dur=${formatMilliseconds(timing.phases.serialization ?? 0)}`,
    `total;dur=${formatMilliseconds(total)}`
  ].join(', ')

  setResponseHeader(event, 'server-timing', serverTiming)
  return true
}

export function readRequestTiming(event: H3Event) {
  const timing = requestTimingByEvent.get(event)
  if (!timing) {
    return null
  }

  return {
    phases: { ...timing.phases },
    databaseSession: timing.databaseSession
  }
}
