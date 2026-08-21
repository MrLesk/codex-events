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
export type D1ExecutionStatus = 'complete' | 'failed' | 'inflight'
export type D1MetadataSummary = string | 'unknown' | 'mixed'
export type D1PrimarySummary = boolean | 'unknown' | 'mixed'
export type D1SessionDescription = 'first-primary' | 'bookmark'

export interface D1StatementObservation {
  databaseDurationMs: number
  databaseDurationUnknownCount: number
  attempts: number
  attemptsUnknownCount: number
  servedByRegion: D1MetadataSummary
  servedByColo: D1MetadataSummary
  servedByPrimary: D1PrimarySummary
}

export interface D1ExecutionObservation {
  databaseDurationMs: number
  databaseDurationUnknownCount: number
  attempts: number
  attemptsUnknownCount: number
  servedByRegion: D1MetadataSummary
  servedByColo: D1MetadataSummary
  servedByPrimary: D1PrimarySummary
  statementMetadata?: D1StatementObservation[]
  statementMetadataOverflowCount?: number
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
  servedByRegion: D1MetadataSummary
  servedByColo: D1MetadataSummary
  servedByPrimary: D1PrimarySummary
  status: D1ExecutionStatus
  statementMetadata: D1StatementObservation[]
  statementMetadataOverflowCount: number
}

const maxReportedD1Executions = 8
export const maxReportedD1Statements = 4

interface RequestTimingState {
  readonly startedAt: number
  readonly phases: Partial<Record<RequestTimingPhase, number>>
  databaseSession: D1SessionDescription | null
  d1: {
    nextOrdinal: number
    executionCount: number
    statementCount: number
    inflightExecutionCount: number
    inflightStatementCount: number
    totalDurationMs: number
    totalDatabaseDurationMs: number
    databaseDurationUnknownCount: number
    totalAttempts: number
    attemptsUnknownCount: number
    servedByRegion: D1MetadataSummary | null
    servedByColo: D1MetadataSummary | null
    servedByPrimary: D1PrimarySummary | null
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
      inflightExecutionCount: 0,
      inflightStatementCount: 0,
      totalDurationMs: 0,
      totalDatabaseDurationMs: 0,
      databaseDurationUnknownCount: 0,
      totalAttempts: 0,
      attemptsUnknownCount: 0,
      servedByRegion: null,
      servedByColo: null,
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

function normalizeServingLocation(value: D1MetadataSummary | null | undefined): D1MetadataSummary {
  if (value === 'mixed' || value === 'unknown') {
    return value
  }

  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,16}$/u.test(value)
    ? value
    : 'unknown'
}

function mergeServingLocation(current: D1MetadataSummary | null, next: D1MetadataSummary) {
  const normalizedNext = normalizeServingLocation(next)
  if (current === null) {
    return normalizedNext
  }

  if (current === 'mixed' || normalizedNext === 'mixed') {
    return 'mixed'
  }

  return current === normalizedNext ? current : 'mixed'
}

function normalizeServedByPrimary(value: D1PrimarySummary | null | undefined): D1PrimarySummary {
  if (value === 'mixed' || value === 'unknown') {
    return value
  }

  return typeof value === 'boolean' ? value : 'unknown'
}

function mergeServedByPrimary(current: D1PrimarySummary | null, next: D1PrimarySummary) {
  const normalizedNext = normalizeServedByPrimary(next)
  if (current === null) {
    return normalizedNext
  }

  if (current === 'mixed' || normalizedNext === 'mixed') {
    return 'mixed'
  }

  return current === normalizedNext ? current : 'mixed'
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
  sessionStart: D1SessionDescription
) {
  if (sessionStart !== 'first-primary' && sessionStart !== 'bookmark') {
    throw new TypeError('Unsupported D1 session description.')
  }

  const timing = getOrCreateRequestTiming(event)
  timing.databaseSession = sessionStart
}

export function startRequestD1Execution(
  event: H3Event,
  api: D1ExecutionApi,
  kind: D1ExecutionKind,
  statementCount: number
) {
  const timing = getOrCreateRequestTiming(event)
  const normalizedStatementCount = Math.max(0, statementCount)
  const execution = {
    ordinal: timing.d1.nextOrdinal++,
    api,
    kind,
    statementCount: normalizedStatementCount,
    startedAt: now(),
    finished: false
  }

  timing.d1.executionCount += 1
  timing.d1.statementCount += execution.statementCount
  timing.d1.inflightExecutionCount += 1
  timing.d1.inflightStatementCount += execution.statementCount

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
      servedByPrimary: 'unknown',
      status: 'inflight',
      statementMetadata: [],
      statementMetadataOverflowCount: 0
    })
  } else {
    timing.d1.overflowCount += 1
  }

  return execution
}

export function finishRequestD1Execution(
  event: H3Event,
  execution: ReturnType<typeof startRequestD1Execution>,
  observation: D1ExecutionObservation,
  status: Exclude<D1ExecutionStatus, 'inflight'> = 'complete'
) {
  const timing = getOrCreateRequestTiming(event)
  if (execution.finished) {
    return
  }

  execution.finished = true
  timing.d1.inflightExecutionCount = Math.max(0, timing.d1.inflightExecutionCount - 1)
  timing.d1.inflightStatementCount = Math.max(0, timing.d1.inflightStatementCount - execution.statementCount)
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
    const statementMetadata = observation.statementMetadata ?? []
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
      servedByPrimary: normalizeServedByPrimary(observation.servedByPrimary),
      status,
      statementMetadata: statementMetadata.slice(0, maxReportedD1Statements),
      statementMetadataOverflowCount: Math.max(
        0,
        (observation.statementMetadataOverflowCount ?? 0)
        + statementMetadata.length
        - maxReportedD1Statements
      )
    }
  }
}

function formatMilliseconds(value: number) {
  return Math.max(0, value).toFixed(2)
}

function formatServedByPrimary(value: D1PrimarySummary | null) {
  return value === null || value === 'unknown'
    ? 'unknown'
    : value === 'mixed'
      ? 'mixed'
      : value
        ? '1'
        : '0'
}

function formatStatementMetadata(statement: D1StatementObservation, ordinal: number) {
  const databaseDuration = statement.databaseDurationUnknownCount > 0
    ? `${formatMilliseconds(statement.databaseDurationMs)};db-unknown=${statement.databaseDurationUnknownCount}`
    : formatMilliseconds(statement.databaseDurationMs)

  return `${ordinal}:db=${databaseDuration};attempts=${statement.attempts};attempts-unknown=${statement.attemptsUnknownCount};region=${normalizeServingLocation(statement.servedByRegion)};colo=${normalizeServingLocation(statement.servedByColo)};primary=${formatServedByPrimary(statement.servedByPrimary)}`
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
    `d1-exec-total;dur=${formatMilliseconds(timing.d1.totalDurationMs)};desc="executions=${timing.d1.executionCount};complete=${timing.d1.executionCount - timing.d1.inflightExecutionCount};inflight=${timing.d1.inflightExecutionCount};statements=${timing.d1.statementCount};inflight-statements=${timing.d1.inflightStatementCount};overflow=${timing.d1.overflowCount}"`,
    `d1-db-total;dur=${formatMilliseconds(timing.d1.totalDatabaseDurationMs)};desc="unknown=${timing.d1.databaseDurationUnknownCount};attempts=${timing.d1.totalAttempts};attempts-unknown=${timing.d1.attemptsUnknownCount};region=${timing.d1.servedByRegion ?? 'unknown'};colo=${timing.d1.servedByColo ?? 'unknown'};primary=${formatServedByPrimary(timing.d1.servedByPrimary)}"`,
    ...timing.d1.executions.map((execution) => {
      const databaseDuration = execution.databaseDurationUnknownCount > 0
        ? `${formatMilliseconds(execution.databaseDurationMs)};db-unknown=${execution.databaseDurationUnknownCount}`
        : formatMilliseconds(execution.databaseDurationMs)
      const statementMetadata = execution.statementMetadata.length > 0
        ? `;stmt=${execution.statementMetadata.map((statement, index) => formatStatementMetadata(statement, index + 1)).join('|')};stmt-overflow=${execution.statementMetadataOverflowCount}`
        : ''

      return `d1-exec-${execution.ordinal};dur=${formatMilliseconds(execution.durationMs)};desc="ordinal=${execution.ordinal};api=${execution.api};kind=${execution.kind};status=${execution.status};statements=${execution.statementCount};db=${databaseDuration};attempts=${execution.attempts};attempts-unknown=${execution.attemptsUnknownCount};region=${execution.servedByRegion};colo=${execution.servedByColo};primary=${formatServedByPrimary(execution.servedByPrimary)}${statementMetadata}"`
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
      inflightExecutionCount: timing.d1.inflightExecutionCount,
      inflightStatementCount: timing.d1.inflightStatementCount,
      totalDurationMs: timing.d1.totalDurationMs,
      totalDatabaseDurationMs: timing.d1.totalDatabaseDurationMs,
      databaseDurationUnknownCount: timing.d1.databaseDurationUnknownCount,
      totalAttempts: timing.d1.totalAttempts,
      attemptsUnknownCount: timing.d1.attemptsUnknownCount,
      servedByRegion: timing.d1.servedByRegion,
      servedByColo: timing.d1.servedByColo,
      servedByPrimary: timing.d1.servedByPrimary,
      overflowCount: timing.d1.overflowCount,
      executions: timing.d1.executions.map(execution => ({
        ...execution,
        statementMetadata: execution.statementMetadata.map(statement => ({ ...statement }))
      }))
    }
  }
}
