import { existsSync, readFileSync } from 'node:fs'
import { performance } from 'node:perf_hooks'

import { expect, type Page, type Request, type Response } from '@playwright/test'

import {
  storageStatePathForPersona,
  type StablePersonaKey
} from './personas.ts'

export const defaultLocalTopologyBudgetMs = 30_000

const legacyFanOutPathPatterns = [
  /^\/api\/events\/slug(?:\/|$)/u,
  /^\/api\/account\/events$/u,
  /^\/api\/events\/participation(?:\/|$)/u,
  /^\/api\/prize-redemptions\/me(?:\/|$)/u,
  /^\/api\/credits(?:\/|$)/u,
  /\/talk-proposals(?:\/|$)/u
]

const editorOrSortableUrlPattern = /(?:sortablejs|md-editor-v3|AdminMarkdownEditor)/u
const runtimeCdnScriptPattern = /(?:unpkg\.com|jsdelivr\.net|cdnjs\.cloudflare\.com|esm\.sh|skypack\.dev)/iu

type StoredState = {
  cookies?: Array<{
    name: string
    value: string
    domain: string
    path: string
    expires: number
    httpOnly: boolean
    secure: boolean
    sameSite: 'Strict' | 'Lax' | 'None'
  }>
  origins?: Array<{
    origin: string
    localStorage: Array<{
      name: string
      value: string
    }>
  }>
}

export interface TopologyRequestEvidence {
  method: string
  url: string
  path: string
  search: string
  resourceType: string
  startedMs: number
  responseMs: number | null
  finishedMs: number | null
  status: number | null
  failed: string | null
  contentType: string | null
  bookmark: string | null
  hasDataEnvelope: boolean | null
  errorCode: string | null
  errorMessage: string | null
}

export interface TopologyPhaseEvidence {
  shellMs: number | null
  bootstrapMs: number | null
  criticalMs: number | null
  usableMs: number | null
  lazyMs: number | null
  mediaMs: number | null
  budgetMs: number
}

function roundMilliseconds(value: number) {
  return Math.round(value * 100) / 100
}

function isApiPath(path: string) {
  return path.startsWith('/api/')
}

function hasDataEnvelope(value: unknown): boolean {
  return typeof value === 'object'
    && value !== null
    && Object.prototype.hasOwnProperty.call(value, 'data')
}

export async function applyStoredStateToPage(persona: StablePersonaKey, page: Page) {
  const storageStatePath = storageStatePathForPersona(persona)

  if (!existsSync(storageStatePath)) {
    throw new Error(`Missing local BDD storage state for ${persona}: ${storageStatePath}`)
  }

  const storageState = JSON.parse(readFileSync(storageStatePath, 'utf8')) as StoredState

  if (storageState.cookies?.length) {
    await page.context().addCookies(storageState.cookies)
  }

  if (!storageState.origins?.length) {
    return
  }

  await page.addInitScript((origins: StoredState['origins']) => {
    if (!origins) {
      return
    }

    for (const entry of origins) {
      if (entry.origin !== window.location.origin) {
        continue
      }

      for (const item of entry.localStorage) {
        window.localStorage.setItem(item.name, item.value)
      }
    }
  }, storageState.origins)
}

export class AccountEventTopologyCapture {
  readonly records: TopologyRequestEvidence[] = []
  readonly consoleErrors: string[] = []
  readonly pageErrors: string[] = []
  readonly phases: TopologyPhaseEvidence = {
    shellMs: null,
    bootstrapMs: null,
    criticalMs: null,
    usableMs: null,
    lazyMs: null,
    mediaMs: null,
    budgetMs: defaultLocalTopologyBudgetMs
  }

  private readonly startedAt = performance.now()
  private readonly requestRecords = new Map<Request, TopologyRequestEvidence>()
  private readonly responseInspections = new Set<Promise<void>>()

  constructor(private readonly page: Page) {
    page.on('request', this.onRequest)
    page.on('response', this.onResponse)
    page.on('requestfinished', this.onRequestFinished)
    page.on('requestfailed', this.onRequestFailed)
    page.on('console', (message) => {
      if (message.type() === 'error') {
        this.consoleErrors.push(message.text())
      }
    })
    page.on('pageerror', (error) => {
      this.pageErrors.push(error.message)
    })
  }

  private elapsed() {
    return roundMilliseconds(performance.now() - this.startedAt)
  }

  private readonly onRequest = (request: Request) => {
    const url = new URL(request.url())
    const record: TopologyRequestEvidence = {
      method: request.method(),
      url: request.url(),
      path: url.pathname,
      search: url.search,
      resourceType: request.resourceType(),
      startedMs: this.elapsed(),
      responseMs: null,
      finishedMs: null,
      status: null,
      failed: null,
      contentType: null,
      bookmark: null,
      hasDataEnvelope: null,
      errorCode: null,
      errorMessage: null
    }

    this.records.push(record)
    this.requestRecords.set(request, record)
  }

  private readonly onResponse = (response: Response) => {
    const record = this.requestRecords.get(response.request())

    if (!record) {
      return
    }

    record.responseMs = this.elapsed()
    record.status = response.status()

    const inspection = (async () => {
      const headers = response.headers()
      record.contentType = headers['content-type'] ?? null
      record.bookmark = headers['x-d1-bookmark'] ?? null

      if (!isApiPath(record.path) || !record.contentType?.includes('json')) {
        return
      }

      try {
        const payload = await response.json() as {
          error?: {
            code?: unknown
            message?: unknown
          }
        }
        record.hasDataEnvelope = hasDataEnvelope(payload)

        if (!record.hasDataEnvelope && typeof payload.error === 'object' && payload.error !== null) {
          record.errorCode = typeof payload.error.code === 'string' ? payload.error.code : null
          record.errorMessage = typeof payload.error.message === 'string' ? payload.error.message : null
        }
      } catch {
        record.hasDataEnvelope = false
      }
    })()

    this.responseInspections.add(inspection)
    void inspection.finally(() => {
      this.responseInspections.delete(inspection)
    }).catch(() => undefined)
  }

  private readonly onRequestFinished = (request: Request) => {
    const record = this.requestRecords.get(request)

    if (record) {
      record.finishedMs = this.elapsed()
    }
  }

  private readonly onRequestFailed = (request: Request) => {
    const record = this.requestRecords.get(request)

    if (!record) {
      return
    }

    record.finishedMs = this.elapsed()
    record.failed = request.failure()?.errorText ?? 'request failed'
  }

  markShell() {
    this.phases.shellMs = this.elapsed()
  }

  markUsable() {
    this.phases.usableMs = this.elapsed()
  }

  markCritical(path: string) {
    this.phases.criticalMs = this.records.find(record =>
      record.path === path && record.finishedMs !== null
    )?.finishedMs ?? null
  }

  markDerivedPhases() {
    const bootstrap = this.records.find(record => record.path === '/api/session' && record.finishedMs !== null)
    const apiRecords = this.records.filter(record => isApiPath(record.path))
    const heavyRecords = this.records.filter(record =>
      record.resourceType === 'script' && editorOrSortableUrlPattern.test(record.url)
    )
    const mediaRecords = this.records.filter(record => record.resourceType === 'image' && record.finishedMs !== null)

    this.phases.bootstrapMs = bootstrap?.finishedMs ?? null
    if (this.phases.criticalMs === null) {
      this.phases.criticalMs = apiRecords
        .filter(record => record.path !== '/api/session' && record.finishedMs !== null)
        .at(-1)?.finishedMs ?? null
    }
    this.phases.lazyMs = heavyRecords
      .filter(record => record.finishedMs !== null)
      .at(-1)?.finishedMs ?? null
    this.phases.mediaMs = mediaRecords.at(-1)?.finishedMs ?? null
  }

  async waitForCompletedPath(path: string, timeoutMs = defaultLocalTopologyBudgetMs) {
    const deadline = Date.now() + timeoutMs

    while (Date.now() <= deadline) {
      const record = this.records.find(candidate =>
        candidate.path === path
        && candidate.finishedMs !== null
        && candidate.failed === null
      )

      if (record) {
        await Promise.allSettled([...this.responseInspections])
        return record
      }

      await new Promise(resolve => setTimeout(resolve, 25))
    }

    throw new Error(`Timed out waiting for completed ${path}.\n${formatTopologyEvidence(this)}`)
  }

  async waitForStartedPath(path: string, timeoutMs = defaultLocalTopologyBudgetMs) {
    const deadline = Date.now() + timeoutMs

    while (Date.now() <= deadline) {
      const record = this.records.find(candidate => candidate.path === path)

      if (record) {
        return record
      }

      await new Promise(resolve => setTimeout(resolve, 25))
    }

    throw new Error(`Timed out waiting for started ${path}.\n${formatTopologyEvidence(this)}`)
  }

  async settle(quietMs = 200) {
    await this.page.waitForTimeout(quietMs)
    await Promise.allSettled([...this.responseInspections])
    this.markDerivedPhases()
  }
}

export function capturePageTopology(page: Page) {
  return new AccountEventTopologyCapture(page)
}

export function apiRecords(capture: AccountEventTopologyCapture) {
  return capture.records.filter(record => isApiPath(record.path))
}

export function pathRecords(capture: AccountEventTopologyCapture, path: string) {
  return apiRecords(capture).filter(record => record.path === path)
}

export function editorOrSortableRecords(capture: AccountEventTopologyCapture) {
  return capture.records.filter(record =>
    record.resourceType === 'script' && editorOrSortableUrlPattern.test(record.url)
  )
}

export function runtimeCdnScriptRecords(capture: AccountEventTopologyCapture) {
  return capture.records.filter(record =>
    record.resourceType === 'script' && runtimeCdnScriptPattern.test(record.url)
  )
}

function formatMilliseconds(value: number | null) {
  return value === null ? 'n/a' : `${value}ms`
}

export function formatTopologyEvidence(capture: AccountEventTopologyCapture) {
  const requestLines = capture.records
    .filter(record => isApiPath(record.path)
      || record.failed !== null
      || editorOrSortableUrlPattern.test(record.url)
      || runtimeCdnScriptPattern.test(record.url))
    .map(record => JSON.stringify({
      method: record.method,
      path: record.path,
      search: record.search,
      type: record.resourceType,
      start: formatMilliseconds(record.startedMs),
      response: formatMilliseconds(record.responseMs),
      finished: formatMilliseconds(record.finishedMs),
      status: record.status,
      failed: record.failed,
      contentType: record.contentType,
      bookmark: Boolean(record.bookmark),
      data: record.hasDataEnvelope,
      errorCode: record.errorCode,
      errorMessage: record.errorMessage
    }))

  return [
    `phases=${JSON.stringify(capture.phases)}`,
    `apiRequests=${apiRecords(capture).length}`,
    `consoleErrors=${JSON.stringify(capture.consoleErrors)}`,
    `pageErrors=${JSON.stringify(capture.pageErrors)}`,
    'requests:',
    ...requestLines
  ].join('\n')
}

export function formatTopologySummary(capture: AccountEventTopologyCapture) {
  const counts = Object.fromEntries(
    apiRecords(capture).reduce((entries, record) => {
      entries.set(record.path, (entries.get(record.path) ?? 0) + 1)
      return entries
    }, new Map<string, number>())
  )

  return [
    `phases=${JSON.stringify(capture.phases)}`,
    `apiCounts=${JSON.stringify(counts)}`,
    `apiErrors=${JSON.stringify(apiRecords(capture)
      .filter(record => record.errorCode !== null || record.errorMessage !== null)
      .map(record => ({ path: record.path, status: record.status, code: record.errorCode, message: record.errorMessage })))}`,
    `failedRequests=${capture.records.filter(record => record.failed !== null).length}`,
    `consoleErrors=${JSON.stringify(capture.consoleErrors)}`,
    `pageErrors=${JSON.stringify(capture.pageErrors)}`
  ].join(' ')
}

export function topologyFailure(
  capture: AccountEventTopologyCapture,
  message: string
): Error {
  return new Error(`${message}\n${formatTopologyEvidence(capture)}`)
}

export function assertExactPathCount(
  capture: AccountEventTopologyCapture,
  path: string,
  expected: number
) {
  const actual = pathRecords(capture, path)

  if (actual.length !== expected) {
    throw topologyFailure(capture, `Expected ${expected} ${path} request(s), observed ${actual.length}.`)
  }

  return actual
}

export function assertNoLegacyFanOut(capture: AccountEventTopologyCapture) {
  const legacy = apiRecords(capture).filter(record =>
    legacyFanOutPathPatterns.some(pattern => pattern.test(record.path))
  )

  if (legacy.length) {
    throw topologyFailure(capture, `Unexpected legacy account fan-out: ${legacy.map(record => record.path).join(', ')}.`)
  }
}

export function assertJsonApiRecord(
  capture: AccountEventTopologyCapture,
  record: TopologyRequestEvidence,
  label: string
) {
  if (record.status === null || record.status < 200 || record.status >= 300) {
    throw topologyFailure(capture, `${label} did not return a successful response.`)
  }

  if (record.hasDataEnvelope !== true) {
    throw topologyFailure(capture, `${label} did not return the expected data envelope.`)
  }
}

export function assertNoEditorOrSortableRequests(capture: AccountEventTopologyCapture) {
  const heavy = editorOrSortableRecords(capture)

  if (heavy.length) {
    throw topologyFailure(capture, `Unrelated surface requested editor/sortable code: ${heavy.map(record => record.url).join(', ')}.`)
  }
}

export function assertNoRuntimeCdnScripts(capture: AccountEventTopologyCapture) {
  const cdnScripts = runtimeCdnScriptRecords(capture)

  if (cdnScripts.length) {
    throw topologyFailure(capture, `Runtime CDN script request(s) observed: ${cdnScripts.map(record => record.url).join(', ')}.`)
  }
}

export function assertBudget(capture: AccountEventTopologyCapture) {
  const usableMs = capture.phases.usableMs

  if (usableMs === null || usableMs > capture.phases.budgetMs) {
    throw topologyFailure(capture, `Usable UI exceeded the generous local budget of ${capture.phases.budgetMs}ms.`)
  }
}

export function assertActiveAccountEventTab(page: Page, tabId: string) {
  return page.getByRole('tab', { name: tabId, exact: true })
}

export async function waitForAccountEventTab(page: Page, tabLabel: string) {
  const tab = assertActiveAccountEventTab(page, tabLabel)
  await tab.waitFor({ state: 'visible' })
  await expect(tab).toHaveAttribute('aria-selected', 'true')

  const panelId = await tab.getAttribute('aria-controls')

  if (!panelId) {
    throw new Error(`Account event tab ${tabLabel} does not declare aria-controls.`)
  }

  await page.locator(`#${panelId}`).waitFor({ state: 'visible' })
}

export async function warmAccountEventSurface(page: Page, slug: string) {
  await page.goto(`/account/events/${encodeURIComponent(slug)}?tab=overview`, {
    waitUntil: 'domcontentloaded'
  })
  await waitForAccountEventTab(page, 'Overview')
  await page.waitForTimeout(250)
}

export async function warmGlobalSurface(page: Page, path: string, heading: string) {
  await page.goto(path, { waitUntil: 'domcontentloaded' })
  await page.getByRole('heading', { name: heading, exact: true }).waitFor({ state: 'visible' })
  await page.waitForTimeout(250)
}
