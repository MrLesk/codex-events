import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as ts from 'typescript'
import { describe, expect, test } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const serverRoot = join(repositoryRoot, 'server')

const explicitNonHttpImporters = new Map<string, Set<string>>([
  ['server/database/client.ts', new Set([
    'createRequestDatabase',
    'getTestDatabase',
    'AppDatabase',
    'AppDatabaseBatch',
    'D1DatabaseBinding',
    'D1DatabaseClientBinding'
  ])],
  ['server/middleware/local-d1-binding.ts', new Set(['D1DatabaseBinding'])],
  ['server/plugins/application-luma-sync-queue.ts', new Set(['createNonHttpDatabase', 'resolveNonHttpD1Binding'])],
  ['server/plugins/event-outcome-email-queue.ts', new Set(['createNonHttpDatabase', 'resolveNonHttpD1Binding'])],
  ['server/plugins/media-cleanup-queue.ts', new Set(['createNonHttpDatabase', 'resolveNonHttpD1Binding'])],
  ['server/plugins/talk-proposal-decision-email-queue.ts', new Set(['createNonHttpDatabase', 'resolveNonHttpD1Binding'])]
])

const infrastructureBoundaryFiles = new Set([
  'server/database/client.ts',
  'server/database/non-http.ts',
  'server/middleware/local-d1-binding.ts'
])

const httpSourceRoots = [
  'server/api/',
  'server/routes/',
  'server/middleware/',
  'server/domains/',
  'server/application/',
  'server/http/'
]

const nonHttpImplementation = 'server/database/non-http.ts'

const forbiddenClientExports = new Set([
  'createDatabase',
  'createDatabaseAccess',
  'createNonHttpDatabase',
  'createPublicReplicaDatabaseAccess',
  'createRequestDatabase',
  'getDatabaseAccess',
  'getD1Binding',
  'getPublicReplicaDatabase',
  'getTestDatabase',
  'D1DatabaseBinding',
  'D1DatabaseClientBinding',
  'D1DatabaseSessionBinding',
  'resolveD1Binding',
  'resolveNonHttpD1Binding',
  'setDatabase',
  'setTestDatabase'
])

const forbiddenIdentifiers = /(?:\$client|\b(?:AppDatabaseAccess|DatabaseConsistency|createDatabase|createDatabaseAccess|createNonHttpDatabase|createPublicReplicaDatabaseAccess|getDatabaseAccess|getD1Binding|getPublicReplicaDatabase|getTestDatabase|resolveD1Binding|resolveNonHttpD1Binding|setDatabase|setTestDatabase)\b)/gu
const forbiddenContextFields = /\b(?:appDb|appDbAccess|databaseAccess|d1Database)\b/u
const forbiddenReplicaUsage = /\b(?:public-replica|getPublicReplicaDatabase|createPublicReplicaDatabaseAccess)\b|consistency\s*:\s*['"]replica['"]/u
const dangerousCallNames = new Set([
  'createNonHttpDatabase',
  'getTestDatabase',
  'resolveNonHttpD1Binding',
  'setTestDatabase'
])

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory()
      ? sourceFiles(path)
      : /\.(?:c|m)?(?:tsx?|js)$/u.test(path)
        ? [path]
        : []
  })
}

function relativePath(file: string) {
  return relative(repositoryRoot, file).split(sep).join('/')
}

function databaseModuleKind(file: string, moduleSpecifier: string) {
  const normalizedModule = moduleSpecifier.replaceAll('\\', '/')
  const candidates = new Set<string>()

  if (normalizedModule.startsWith('.')) {
    candidates.add(resolve(dirname(file), normalizedModule))
  }

  const normalizedCandidates = [...candidates].map(candidate => candidate.replace(/\.(?:c|m)?tsx?$/u, ''))
  const clientPath = join(serverRoot, 'database/client')
  const nonHttpPath = join(serverRoot, 'database/non-http')

  if (normalizedCandidates.includes(clientPath)
    || normalizedModule === '#server/database/client'
    || normalizedModule === 'server/database/client'
    || /(?:^|\/)database\/client(?:\.(?:c|m)?tsx?)?$/u.test(normalizedModule)) {
    return 'client' as const
  }

  if (normalizedCandidates.includes(nonHttpPath)
    || normalizedModule === '#server/database/non-http'
    || normalizedModule === 'server/database/non-http'
    || /(?:^|\/)database\/non-http(?:\.(?:c|m)?tsx?)?$/u.test(normalizedModule)) {
    return 'non-http' as const
  }

  if (normalizedModule === 'drizzle-orm/d1') {
    return 'drizzle-d1' as const
  }

  return undefined
}

function namedModuleBindings(node: ts.Node) {
  if (ts.isImportDeclaration(node)) {
    const bindings = node.importClause?.namedBindings
    if (!bindings || ts.isNamespaceImport(bindings) || node.importClause?.name) {
      return undefined
    }

    return bindings.elements.map(element => element.propertyName?.text ?? element.name.text)
  }

  if (ts.isExportDeclaration(node)) {
    if (!node.exportClause || !ts.isNamedExports(node.exportClause)) {
      return undefined
    }

    return node.exportClause.elements.map(element => element.propertyName?.text ?? element.name.text)
  }

  return undefined
}

function inspectImportedModule(
  file: string,
  moduleSpecifier: string,
  node: ts.Node,
  violations: string[]
) {
  const kind = databaseModuleKind(file, moduleSpecifier)
  const path = relativePath(file)

  if (kind === 'non-http') {
    const allowedNames = explicitNonHttpImporters.get(path)
    const names = namedModuleBindings(node)

    if (!allowedNames) {
      violations.push(`${path} imports the non-HTTP database API`)
      return
    }

    if (!names) {
      violations.push(`${path} uses a broad non-HTTP database import`)
      return
    }

    for (const name of names) {
      if (!allowedNames.has(name)) {
        violations.push(`${path} imports non-HTTP database API ${name}`)
      }
    }
    return
  }

  if (kind === 'drizzle-d1') {
    if (path !== nonHttpImplementation) {
      violations.push(`${path} creates a raw Drizzle D1 client`)
    }
    return
  }

  if (kind !== 'client') {
    return
  }

  const names = namedModuleBindings(node)
  if (!names) {
    violations.push(`${path} uses a broad database client import`)
    return
  }

  for (const name of names) {
    if (forbiddenClientExports.has(name)) {
      violations.push(`${path} imports forbidden client API ${name}`)
    }
  }
}

function importBoundaryViolations(file: string, source: string) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.getScriptKindFromFileName(file))
  const violations: string[] = []

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      inspectImportedModule(file, node.moduleSpecifier.text, node, violations)
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      inspectImportedModule(file, node.moduleSpecifier.text, node, violations)
    }

    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const moduleArgument = node.arguments[0]
      if (ts.isStringLiteral(moduleArgument)) {
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
        if (isDynamicImport || isRequire) {
          inspectImportedModule(file, moduleArgument.text, node, violations)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

function moduleImportsKind(file: string, source: string, expectedKind: 'client' | 'non-http' | 'drizzle-d1') {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.getScriptKindFromFileName(file))
  let found = false

  const visit = (node: ts.Node) => {
    if (found) {
      return
    }

    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      found = databaseModuleKind(file, node.moduleSpecifier.text) === expectedKind
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      found = databaseModuleKind(file, node.moduleSpecifier.text) === expectedKind
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return found
}

function isBackgroundHookCall(node: ts.Node) {
  let current: ts.Node | undefined = node.parent

  while (current) {
    if (ts.isCallExpression(current)
      && ts.isPropertyAccessExpression(current.expression)
      && current.expression.name.text === 'hook'
      && current.arguments[0]
      && ts.isStringLiteral(current.arguments[0])
      && /^cloudflare:(?:queue|scheduled)$/u.test(current.arguments[0].text)) {
      return true
    }
    current = current.parent
  }

  return false
}

function callSiteViolations(file: string, source: string) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.getScriptKindFromFileName(file))
  const path = relativePath(file)
  const violations: string[] = []

  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const name = node.expression.text
      if (dangerousCallNames.has(name)) {
        if (name === 'getTestDatabase' && path === 'server/database/client.ts') {
          // The HTTP accessor only consults this map inside its explicit
          // non-HTTP test/infrastructure branch; the source assertion below
          // keeps that guard visible.
        } else if ((name === 'createNonHttpDatabase' || name === 'resolveNonHttpD1Binding')
          && explicitNonHttpImporters.has(path)
          && path !== 'server/database/client.ts'
          && isBackgroundHookCall(node)) {
          // Queue and scheduler plugins are the only production construction
          // boundaries and each call must remain inside its Cloudflare hook.
        } else {
          violations.push(`${path} calls forbidden database API ${name}`)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

function unexpectedForbiddenIdentifiers(file: string, source: string) {
  const path = relativePath(file)
  if (path === nonHttpImplementation) {
    return []
  }

  const allowed = path === 'server/database/client.ts'
    ? new Set(['getTestDatabase'])
    : explicitNonHttpImporters.has(path)
      ? new Set(['createNonHttpDatabase', 'resolveNonHttpD1Binding'])
      : new Set<string>()

  return [...source.matchAll(forbiddenIdentifiers)]
    .map(match => match[0])
    .filter(identifier => !allowed.has(identifier))
    .map(identifier => `${path} uses a forbidden database API ${identifier}`)
}

describe('HTTP database boundary', () => {
  test('keeps the application facade rooted in an explicit operation allowlist', () => {
    const source = readFileSync(join(repositoryRoot, nonHttpImplementation), 'utf8')

    expect(source).toMatch(/const supportedRootCapabilities/u)
    expect(source).toMatch(/type AppDatabase = Pick<DrizzleDatabase, SupportedRootCapability>/u)
    expect(source).toMatch(/Object\.create\(null\)/u)
    expect(source).toMatch(/Object\.freeze\(facade\)/u)
    expect(source).toMatch(/new Proxy/u)
    expect(source).not.toMatch(/\b(?:DeniedRootCapability|BuilderMethodKey|PublicBuilder|RuntimeBuilderKind|selectBuilderMethods|mutationBuilderMethods|createSafePrototype)\b/u)
    expect(source.split('\n').length).toBeLessThan(380)
  })

  test('covers every production server module with exact database import and call-site boundaries', () => {
    const violations = sourceFiles(serverRoot).flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const path = relativePath(file)
      const isInfrastructureBoundary = infrastructureBoundaryFiles.has(path)
      return [
        ...(isInfrastructureBoundary ? [] : unexpectedForbiddenIdentifiers(file, source)),
        ...(isInfrastructureBoundary || !forbiddenContextFields.test(source)
          ? []
          : [`${path} exposes database state through context`]),
        ...importBoundaryViolations(file, source),
        ...callSiteViolations(file, source)
      ]
    })

    expect(violations).toEqual([])
  })

  test('covers the whole production import graph with only explicit construction boundaries', () => {
    const nonHttpImporters = sourceFiles(serverRoot)
      .filter(file => moduleImportsKind(file, readFileSync(file, 'utf8'), 'non-http'))
      .map(relativePath)
      .sort()

    expect(nonHttpImporters).toEqual([
      ...explicitNonHttpImporters.keys()
    ].sort())
  })

  test('keeps non-HTTP construction out of HTTP-facing source roots', () => {
    const violations = sourceFiles(serverRoot).flatMap((file) => {
      const path = relativePath(file)
      if (infrastructureBoundaryFiles.has(path)
        || !httpSourceRoots.some(root => path.startsWith(root))) {
        return []
      }

      const source = readFileSync(file, 'utf8')
      return moduleImportsKind(file, source, 'non-http')
        ? [`${path} reaches the non-HTTP database construction module`]
        : []
    })

    expect(violations).toEqual([])
  })

  test('does not expose replica access or a generic replica option in production', () => {
    const violations = sourceFiles(serverRoot)
      .filter(file => forbiddenReplicaUsage.test(readFileSync(file, 'utf8')))
      .map(file => relativePath(file))

    expect(violations).toEqual([])
  })

  test('does not export raw binding or database access-object constructors', () => {
    const clientSource = readFileSync(join(serverRoot, 'database/client.ts'), 'utf8')

    expect(clientSource).not.toMatch(/export\s+(?:async\s+)?function\s+(?:create|resolve|getD1Binding|setDatabase)/u)
    expect(clientSource).not.toMatch(/export\s+(?:interface|type)\s+(?:AppDatabaseAccess|DatabaseConsistency)/u)
    expect(clientSource).not.toMatch(/export\s+type\s*\{[^}]*\bD1Database(?:Binding|ClientBinding)\b[^}]*\}/su)
    expect(clientSource).not.toMatch(/export\s+(?:interface|type)\s+D1DatabaseSessionBinding/u)
    expect(clientSource).toMatch(/if\s*\(!isHttpRequest\(event\)\)\s*\{[\s\S]*?getTestDatabase\(event\)/u)
  })

  test('keeps D1 execution attribution at the capability-narrowed session adapter', () => {
    const clientSource = readFileSync(join(serverRoot, 'database/client.ts'), 'utf8')
    const timingSource = readFileSync(join(serverRoot, 'http/request-timing.ts'), 'utf8')
    const allowedInstrumentationFiles = new Set([
      'server/database/client.ts',
      'server/http/request-timing.ts'
    ])
    const instrumentationFiles = sourceFiles(serverRoot)
      .filter(file => /\b(?:startRequestD1Execution|finishRequestD1Execution|measureD1Execution)\b/u.test(readFileSync(file, 'utf8')))
      .map(relativePath)
      .sort()

    expect(instrumentationFiles).toEqual([...allowedInstrumentationFiles].sort())
    expect(clientSource).toMatch(/createTimedSessionDatabaseBinding\(event, binding\.withSession\(sessionAnchor\)\)/u)
    expect(clientSource).toMatch(/const rawStatementByTimedStatement = new WeakMap/u)
    expect(clientSource).toMatch(/batch: async <T>[\s\S]*?measureD1Execution/u)
    expect(timingSource).toMatch(/const maxReportedD1Executions = 8/u)
  })

  test('runs recovery only from explicit background entrypoints', () => {
    const middlewareRecoveryFiles = sourceFiles(join(serverRoot, 'middleware'))
      .filter(file => /startup-recovery/u.test(basename(file)))
    expect(middlewareRecoveryFiles).toEqual([])

    const talkDomainSource = readFileSync(join(serverRoot, 'domains/talk-proposals/email-queue.ts'), 'utf8')
    const lumaDomainSource = readFileSync(join(serverRoot, 'domains/applications/luma-sync-queue.ts'), 'utf8')
    expect(`${talkDomainSource}\n${lumaDomainSource}`).not.toMatch(/(?:startupRecoveryPromise|schedule.*StartupRecovery|trigger:\s*['"]startup['"])/u)

    const talkPluginSource = readFileSync(join(serverRoot, 'plugins/talk-proposal-decision-email-queue.ts'), 'utf8')
    const lumaPluginSource = readFileSync(join(serverRoot, 'plugins/application-luma-sync-queue.ts'), 'utf8')
    const mediaCleanupPluginSource = readFileSync(join(serverRoot, 'plugins/media-cleanup-queue.ts'), 'utf8')
    expect(talkPluginSource).toMatch(/hooks\.hook\(['"]cloudflare:scheduled['"][\s\S]*?createNonHttpDatabase\([\s\S]*?reconcilePendingTalkProposalDecisionEmails\([\s\S]*?trigger:\s*['"]scheduled['"]/u)
    expect(lumaPluginSource).toMatch(/hooks\.hook\(['"]cloudflare:scheduled['"][\s\S]*?createNonHttpDatabase\([\s\S]*?recoverStaleApplicationLumaSyncMessages\(/u)
    expect(mediaCleanupPluginSource).toMatch(/hooks\.hook\(['"]cloudflare:scheduled['"][\s\S]*?createNonHttpDatabase\([\s\S]*?dispatchManagedMediaCleanupOutbox\(/u)
    expect(talkPluginSource).not.toMatch(/defineEventHandler|eventHandler/u)
    expect(lumaPluginSource).not.toMatch(/defineEventHandler|eventHandler/u)
  })

  test('has exactly one Nitro beforeResponse bookmark owner', () => {
    const hookFiles = sourceFiles(join(repositoryRoot, 'server/plugins'))
      .filter(file => /hooks\.hook\(['"]beforeResponse['"]|hooks\.hook\(`beforeResponse`/u.test(readFileSync(file, 'utf8')))

    expect(hookFiles.map(file => basename(file))).toEqual(['database-bookmark.ts'])
  })
})
