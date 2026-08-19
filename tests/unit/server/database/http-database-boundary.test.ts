import { readFileSync, readdirSync } from 'node:fs'
import { basename, dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

import * as ts from 'typescript'
import { describe, expect, test } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url))
const serverRoot = join(repositoryRoot, 'server')

const nonHttpAllowlist = new Set([
  'server/database/client.ts',
  'server/database/non-http.ts',
  'server/domains/applications/luma-sync-queue.ts',
  'server/domains/outcomes/email-queue.ts',
  'server/domains/talk-proposals/email-queue.ts',
  'server/middleware/local-d1-binding.ts',
  'server/plugins/talk-proposal-decision-email-queue.ts'
])

const forbiddenClientExports = new Set([
  'createDatabase',
  'createDatabaseAccess',
  'createPublicReplicaDatabaseAccess',
  'getDatabaseAccess',
  'getD1Binding',
  'getPublicReplicaDatabase',
  'D1DatabaseBinding',
  'D1DatabaseClientBinding',
  'D1DatabaseSessionBinding',
  'resolveD1Binding',
  'setDatabase'
])

const forbiddenIdentifiers = /(?:\$client|\b(?:AppDatabaseAccess|DatabaseConsistency|createDatabase|createDatabaseAccess|createNonHttpDatabase|createPublicReplicaDatabaseAccess|getDatabaseAccess|getD1Binding|getPublicReplicaDatabase|getTestDatabase|resolveD1Binding|resolveNonHttpD1Binding|setDatabase|setTestDatabase)\b)/u
const forbiddenContextFields = /\b(?:appDb|appDbAccess|databaseAccess|d1Database)\b/u
const forbiddenReplicaUsage = /\b(?:public-replica|getPublicReplicaDatabase|createPublicReplicaDatabaseAccess)\b|consistency\s*:\s*['"]replica['"]/u

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

function isAllowlisted(file: string) {
  return nonHttpAllowlist.has(relativePath(file))
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

function importBoundaryViolations(file: string, source: string) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.getScriptKindFromFileName(file))
  const violations: string[] = []

  const inspectModule = (moduleSpecifier: string, node: ts.Node) => {
    const kind = databaseModuleKind(file, moduleSpecifier)

    if (kind === 'non-http' && !isAllowlisted(file)) {
      violations.push(`${relativePath(file)} imports the non-HTTP database API`)
      return
    }

    if (kind === 'drizzle-d1' && !isAllowlisted(file)) {
      violations.push(`${relativePath(file)} creates a raw Drizzle D1 client`)
      return
    }

    if (kind !== 'client' || isAllowlisted(file)) {
      return
    }

    if (ts.isImportDeclaration(node)) {
      const bindings = node.importClause?.namedBindings

      if (node.importClause?.name || !bindings || ts.isNamespaceImport(bindings)) {
        violations.push(`${relativePath(file)} uses a broad database client import`)
        return
      }

      for (const element of bindings.elements) {
        if (forbiddenClientExports.has(element.propertyName?.text ?? element.name.text)) {
          violations.push(`${relativePath(file)} imports forbidden client API ${element.propertyName?.text ?? element.name.text}`)
        }
      }
    } else if (ts.isExportDeclaration(node)) {
      violations.push(`${relativePath(file)} re-exports the database client`)
    } else {
      violations.push(`${relativePath(file)} dynamically accesses the database client`)
    }
  }

  const visit = (node: ts.Node) => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      inspectModule(node.moduleSpecifier.text, node)
    }

    if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
      inspectModule(node.moduleSpecifier.text, node)
    }

    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const moduleArgument = node.arguments[0]
      if (ts.isStringLiteral(moduleArgument)) {
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require'
        if (isDynamicImport || isRequire) {
          inspectModule(moduleArgument.text, node)
        }
      }
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return violations
}

describe('HTTP database boundary', () => {
  test('covers every production server module and keeps raw database APIs allowlisted', () => {
    const violations = sourceFiles(serverRoot).flatMap((file) => {
      const source = readFileSync(file, 'utf8')
      const fileViolations = isAllowlisted(file)
        ? []
        : [
            ...(forbiddenIdentifiers.test(source) ? [`${relativePath(file)} uses a forbidden database API`] : []),
            ...(forbiddenContextFields.test(source) ? [`${relativePath(file)} exposes database state through context`] : [])
          ]

      return [...fileViolations, ...importBoundaryViolations(file, source)]
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
  })

  test('has exactly one Nitro beforeResponse bookmark owner', () => {
    const hookFiles = sourceFiles(join(repositoryRoot, 'server/plugins'))
      .filter(file => /hooks\.hook\(['"]beforeResponse['"]|hooks\.hook\(`beforeResponse`/u.test(readFileSync(file, 'utf8')))

    expect(hookFiles.map(file => basename(file))).toEqual(['database-bookmark.ts'])
  })
})
