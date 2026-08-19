import { readFileSync, readdirSync } from 'node:fs'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, test } from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../../', import.meta.url))

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts')
        ? [path]
        : []
  })
}

describe('HTTP database boundary', () => {
  test('does not expose raw D1 or injected database access to HTTP handlers', () => {
    const forbidden = /\b(?:getD1Binding|resolveD1Binding|createDatabase|setDatabase)\b|context\.appDb\b/u
    const files = [
      ...sourceFiles(join(repositoryRoot, 'server/api')),
      ...sourceFiles(join(repositoryRoot, 'server/routes'))
    ]
    const violations = files.filter(file => forbidden.test(readFileSync(file, 'utf8')))

    expect(violations.map(file => basename(file))).toEqual([])
  })

  test('has exactly one Nitro beforeResponse bookmark owner', () => {
    const hookFiles = sourceFiles(join(repositoryRoot, 'server/plugins'))
      .filter(file => /hooks\.hook\(['"]beforeResponse['"]|hooks\.hook\(`beforeResponse`/u.test(readFileSync(file, 'utf8')))

    expect(hookFiles.map(file => basename(file))).toEqual(['database-bookmark.ts'])
  })
})
