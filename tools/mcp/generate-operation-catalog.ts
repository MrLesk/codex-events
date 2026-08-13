import { readFileSync, writeFileSync } from 'node:fs'

import type { McpEligibilityEntry } from '../../server/application/operations/eligibility-manifest'
import { mcpEligibilityManifest } from '../../server/application/operations/eligibility-manifest'

const outputPath = 'server/application/operations/generated-catalog.ts'

function includedRoutes(manifest: readonly McpEligibilityEntry[]) {
  return manifest
    .filter((entry): entry is Extract<McpEligibilityEntry, { disposition: 'include' }> => entry.disposition === 'include')
    .map(entry => entry.route)
    .sort()
}

export function catalogRoutes(source: string) {
  return [...source.matchAll(/import\('\.\.\/\.\.\/api\/([^']+)'\)/gu)]
    .map(match => `${match[1]}.ts`)
    .sort()
}

export function assertCatalogMatchesEligibilityManifest(
  source: string,
  manifest: readonly McpEligibilityEntry[] = mcpEligibilityManifest
) {
  const expected = includedRoutes(manifest)
  const actual = catalogRoutes(source)
  if (new Set(actual).size !== actual.length) throw new Error('Generated MCP operation catalog contains duplicate route bindings')
  const missing = expected.filter(route => !actual.includes(route))
  const unexpected = actual.filter(route => !expected.includes(route))
  if (missing.length || unexpected.length) {
    throw new Error(`Generated MCP operation catalog differs from the eligibility manifest; missing: ${missing.join(', ') || 'none'}; unexpected: ${unexpected.join(', ') || 'none'}`)
  }
}

export function generateOperationCatalogSource(manifest: readonly McpEligibilityEntry[] = mcpEligibilityManifest) {
  const routes = includedRoutes(manifest)
  const body = routes.map(route => `  () => import('../../api/${route.replace(/\.ts$/u, '')}')`).join(',\n')
  const source = `// Generated from the independently maintained MCP eligibility manifest. Do not edit by hand.\nexport const applicationOperationLoaders = [\n${body}\n]\n`
  assertCatalogMatchesEligibilityManifest(source, manifest)
  return source
}

if (import.meta.main) {
  const generated = generateOperationCatalogSource()
  if (process.argv.includes('--check')) {
    if (readFileSync(outputPath, 'utf8') !== generated) throw new Error(`${outputPath} is stale; run bun tools/mcp/generate-operation-catalog.ts`)
  } else {
    writeFileSync(outputPath, generated)
  }
}
