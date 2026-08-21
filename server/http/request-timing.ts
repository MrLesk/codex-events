import type { H3Event } from 'h3'

import { setResponseHeader } from 'h3'

type RequestTimingPhase = 'actor'
  | 'actor-session'
  | 'actor-d1'
  | 'authorization'
  | 'database-session'
  | 'd1'
  | 'serialization'

export type D1ExecutionApi = 'prepare' | 'batch'
export type D1ExecutionKind = 'all' | 'first' | 'raw' | 'run' | 'batch'

export interface D1ExecutionObservation {
  databaseDurationMs: number
  databaseDurationUnknownCount: number
  attempts: number
  attemptsUnknownCount: number
  servedByRegion: string | null
  servedByColo: string | null
  servedByPrimary: boolean | 'mixed' | null
}

export interface D1ExecutionTiming {
  ordinal: number
  api: D1ExecutionApi
  kind: D1ExecutionKind
  statementCount: number
  durationMs: number
  databaseDurationMs: number
  databaseDurationUnknownCount: number
  attempts: number
  attemptsUnknownCount: number
  servedByRegion: string
  servedByColo: string
  servedByPrimary: boolean | 'mixed' | null
}

const maxReportedD1Executions = 8

interface RequestTimingState {
  readonly startedAt: number
  readonly phases: Partial<Record<RequestTimingPhase, number>>
  databaseSession: 'first-primary' | 'bookmark' | null
  d1: {
    nextOrdinal: number
    executionCount: number
    statementCount: number
    totalDurationMs: number
    totalDatabaseDurationMs: number
    databaseDurationUnknownCount: number
    totalAttempts: number
    attemptsUnknownCount: number
    servedByRegion: string
    servedByColo: string
    servedByPrimary: boolean | 'mixed' | null
    overflowCount: number
    executions: D1ExecutionTiming[]
  }
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
    databaseSession: null,
    d1: {
      nextOrdinal: 1,
      executionCount: 0,
      statementCount: 0,
      totalDurationMs: 0,
      totalDatabaseDurationMs: 0,
      databaseDurationUnknownCount: 0,
      totalAttempts: 0,
      attemptsUnknownCount: 0,
      servedByRegion: 'unknown',
      servedByColo: 'unknown',
      servedByPrimary: null,
      overflowCount: 0,
      executions: []
    }
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

function normalizeServingLocation(value: string | null | undefined) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,16}$/u.test(value)
    ? value
    : 'unknown'
}

function mergeServingLocation(current: string, next: string | null | undefined) {
  const normalizedNext = normalizeServingLocation(next)
  return current === 'unknown'
    ? normalizedNext
    : current === normalizedNext
      ? current
      : 'mixed'
}

function mergeServedByPrimary(current: boolean | 'mixed' | null, next: boolean | 'mixed' | null) {
  if (next === null) {
    return current === null ? null : current
  }

  return current === null
    ? next
    : current === next
      ? current
      : 'mixed'
}

export function measureRequestPhaseSync<T>(
  event: H3Event,
  phase: RequestTimingPhase,
  operation: () => T
) {
  const timing = getOrCreateRequestTiming(event)
  const startedAt = now()

  try {
    return operation()
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

export function startRequestD1Execution(
  event: H3Event,
  api: D1ExecutionApi,
  kind: D1ExecutionKind,
  statementCount: number
) {
  const timing = getOrCreateRequestTiming(event)
  const execution = {
    ordinal: timing.d1.nextOrdinal++,
    api,
    kind,
    statementCount: Math.max(0, statementCount),
    startedAt: now()
  }

  timing.d1.executionCount += 1
  timing.d1.statementCount += execution.statementCount

  if (execution.ordinal <= maxReportedD1Executions) {
    timing.d1.executions.push({
      ordinal: execution.ordinal,
      api: execution.api,
      kind: execution.kind,
      statementCount: execution.statementCount,
      durationMs: 0,
      databaseDurationMs: 0,
      databaseDurationUnknownCount: execution.statementCount,
      attempts: 0,
      attemptsUnknownCount: execution.statementCount,
      servedByRegion: 'unknown',
      servedByColo: 'unknown',
      servedByPrimary: null
    })
  } else {
    timing.d1.overflowCount += 1
  }

  return execution
}

export function finishRequestD1Execution(
  event: H3Event,
  execution: ReturnType<typeof startRequestD1Execution>,
  observation: D1ExecutionObservation
) {
  const timing = getOrCreateRequestTiming(event)
  const durationMs = Math.max(0, now() - execution.startedAt)
  const databaseDurationMs = Math.max(0, observation.databaseDurationMs)
  const databaseDurationUnknownCount = Math.max(0, observation.databaseDurationUnknownCount)
  const attempts = Math.max(0, observation.attempts)
  const attemptsUnknownCount = Math.max(0, observation.attemptsUnknownCount)

  timing.d1.totalDurationMs += durationMs
  timing.d1.totalDatabaseDurationMs += databaseDurationMs
  timing.d1.databaseDurationUnknownCount += databaseDurationUnknownCount
  timing.d1.totalAttempts += attempts
  timing.d1.attemptsUnknownCount += attemptsUnknownCount
  timing.d1.servedByRegion = mergeServingLocation(timing.d1.servedByRegion, observation.servedByRegion)
  timing.d1.servedByColo = mergeServingLocation(timing.d1.servedByColo, observation.servedByColo)
  timing.d1.servedByPrimary = mergeServedByPrimary(timing.d1.servedByPrimary, observation.servedByPrimary)

  const reportedExecutionIndex = timing.d1.executions.findIndex(reported => reported.ordinal === execution.ordinal)
  if (reportedExecutionIndex !== -1) {
    timing.d1.executions[reportedExecutionIndex] = {
      ordinal: execution.ordinal,
      api: execution.api,
      kind: execution.kind,
      statementCount: execution.statementCount,
      durationMs,
      databaseDurationMs,
      databaseDurationUnknownCount,
      attempts,
      attemptsUnknownCount,
      servedByRegion: normalizeServingLocation(observation.servedByRegion),
      servedByColo: normalizeServingLocation(observation.servedByColo),
      servedByPrimary: observation.servedByPrimary
    }
  }
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
  const serverTimingEntries = [
    `actor;dur=${formatMilliseconds(timing.phases.actor ?? 0)}`,
    `actor-session;dur=${formatMilliseconds(timing.phases['actor-session'] ?? 0)}`,
    `actor-d1;dur=${formatMilliseconds(timing.phases['actor-d1'] ?? 0)}`,
    `authorization;dur=${formatMilliseconds(timing.phases.authorization ?? 0)}`,
    `database-session;dur=${formatMilliseconds(timing.phases['database-session'] ?? 0)}`,
    `d1;dur=${formatMilliseconds(timing.phases.d1 ?? 0)};desc="${d1Description}"`,
    `serialization;dur=${formatMilliseconds(timing.phases.serialization ?? 0)}`,
    `total;dur=${formatMilliseconds(total)}`
  ]

  serverTimingEntries.push(
    `d1-exec-total;dur=${formatMilliseconds(timing.d1.totalDurationMs)};desc="executions=${timing.d1.executionCount};statements=${timing.d1.statementCount};overflow=${timing.d1.overflowCount}"`,
    `d1-db-total;dur=${formatMilliseconds(timing.d1.totalDatabaseDurationMs)};desc="unknown=${timing.d1.databaseDurationUnknownCount};attempts=${timing.d1.totalAttempts};attempts-unknown=${timing.d1.attemptsUnknownCount};region=${timing.d1.servedByRegion};colo=${timing.d1.servedByColo};primary=${timing.d1.servedByPrimary === null ? 'unknown' : timing.d1.servedByPrimary === 'mixed' ? 'mixed' : timing.d1.servedByPrimary ? '1' : '0'}"`,
    ...timing.d1.executions.map((execution) => {
      const databaseDuration = execution.databaseDurationUnknownCount > 0
        ? `${formatMilliseconds(execution.databaseDurationMs)};db-unknown=${execution.databaseDurationUnknownCount}`
        : formatMilliseconds(execution.databaseDurationMs)

      return `d1-exec-${execution.ordinal};dur=${formatMilliseconds(execution.durationMs)};desc="ordinal=${execution.ordinal};api=${execution.api};kind=${execution.kind};statements=${execution.statementCount};db=${databaseDuration};attempts=${execution.attempts};attempts-unknown=${execution.attemptsUnknownCount};region=${execution.servedByRegion};colo=${execution.servedByColo};primary=${execution.servedByPrimary === null ? 'unknown' : execution.servedByPrimary === 'mixed' ? 'mixed' : execution.servedByPrimary ? '1' : '0'}"`
    })
  )

  const serverTiming = serverTimingEntries.join(', ')

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
    databaseSession: timing.databaseSession,
    d1: {
      executionCount: timing.d1.executionCount,
      statementCount: timing.d1.statementCount,
      totalDurationMs: timing.d1.totalDurationMs,
      totalDatabaseDurationMs: timing.d1.totalDatabaseDurationMs,
      databaseDurationUnknownCount: timing.d1.databaseDurationUnknownCount,
      totalAttempts: timing.d1.totalAttempts,
      attemptsUnknownCount: timing.d1.attemptsUnknownCount,
      servedByRegion: timing.d1.servedByRegion,
      servedByColo: timing.d1.servedByColo,
      servedByPrimary: timing.d1.servedByPrimary,
      overflowCount: timing.d1.overflowCount,
      executions: timing.d1.executions.map(execution => ({ ...execution }))
    }
  }
}
