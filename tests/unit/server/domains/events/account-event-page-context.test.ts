import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'

const contextSource = readFileSync(
  new URL('../../../../../server/domains/events/account-event-page-context.ts', import.meta.url),
  'utf8'
)

describe('account-event page context boundary', () => {
  test('uses one explicit actor, database, and authorization boundary', () => {
    expect(contextSource.match(/getRequestActor\(/g)).toHaveLength(1)
    expect(contextSource.match(/getDatabase\(/g)).toHaveLength(1)
    expect(contextSource.match(/database\.query\.events\.findFirst/g)).toHaveLength(1)
    expect(contextSource.match(/resolveEventAuthorization\(/g)).toHaveLength(1)
    expect(contextSource).toContain('resolveAccountEventPageVisibilityAndAccess({')
    expect(contextSource).toContain('if (input.authorization.explicitRole !== null)')
    expect(contextSource).toContain('const [application, membershipRows] = await Promise.all([')
    expect(contextSource).toContain('actor,\n      authorization,\n      database,\n      event')
    expect(contextSource).not.toContain('eventRoleAssignments')
    expect(contextSource.indexOf('resolveEventAuthorization(h3Event, event.id)'))
      .toBeLessThan(contextSource.indexOf('resolveAccountEventPageVisibilityAndAccess({'))
  })

  test('does not delegate to another workspace accessor or create an HTTP/database escape hatch', () => {
    expect(contextSource).not.toContain('requireEventWorkspaceAccess')
    expect(contextSource).not.toContain('getDatabaseSession')
    expect(contextSource).not.toContain('fetch(')
    expect(contextSource).not.toContain('$fetch')
    expect(contextSource).not.toContain('useAuth0')
    expect(contextSource).not.toContain('withSession')
    expect(contextSource).not.toContain('inArray')
  })
})
