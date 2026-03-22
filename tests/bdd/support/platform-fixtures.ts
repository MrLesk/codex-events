import { mkdirSync, rmSync } from 'node:fs'
import { dirname } from 'node:path'
import { DatabaseSync } from 'node:sqlite'

import { readMigrationSql } from '../../support/backend/migrations.ts'
import { resolvePlatformFixtureTarget, type ProvisionedStablePersona } from './personas.ts'

const fixtureTimestamp = '2026-03-22T12:00:00.000Z'
export const fixtureHackathonId = 'hackathon_e2e_fixture'
export const fixtureApplicationTermsId = 'hackathon_terms_application_fixture'
export const fixtureWinnerTermsId = 'hackathon_terms_winner_fixture'
export const fixturePrivacyDocumentId = 'platform_document_privacy_fixture'
export const fixtureTermsDocumentId = 'platform_document_terms_fixture'

export const platformFixtureIds = {
  hackathonId: fixtureHackathonId,
  applicationTermsDocumentId: fixtureApplicationTermsId,
  winnerTermsDocumentId: fixtureWinnerTermsId,
  privacyDocumentId: fixturePrivacyDocumentId,
  platformTermsDocumentId: fixtureTermsDocumentId
} as const

const personaUserIds: Record<ProvisionedStablePersona['key'], string> = {
  platform_admin: 'user_platform_admin',
  hackathon_admin: 'user_hackathon_admin',
  judge: 'user_judge',
  regular_user: 'user_regular_user'
}

function sqlLiteral(value: string | null) {
  if (value === null) {
    return 'null'
  }

  return `'${value.replaceAll('\'', '\'\'')}'`
}

function userTuple(persona: ProvisionedStablePersona) {
  return `(${[
    sqlLiteral(personaUserIds[persona.key]),
    sqlLiteral(persona.auth0Subject),
    sqlLiteral(persona.email),
    sqlLiteral(persona.displayName),
    persona.key === 'platform_admin' ? '1' : '0',
    'null',
    'null',
    'null',
    sqlLiteral(fixtureTimestamp),
    sqlLiteral(fixtureTimestamp),
    'null'
  ].join(', ')})`
}

function buildFixtureSql(personas: ProvisionedStablePersona[]) {
  const platformAdminId = personaUserIds.platform_admin
  const hackathonAdminId = personaUserIds.hackathon_admin
  const judgeId = personaUserIds.judge

  return [
    'pragma foreign_keys = on',
    'begin',
    'delete from audit_logs',
    'delete from prize_redemptions',
    'delete from prize_eligibility_snapshots',
    'delete from prizes',
    'delete from judge_criterion_scores',
    'delete from judge_assignments',
    'delete from evaluation_criteria',
    'delete from submissions',
    'delete from team_join_requests',
    'delete from team_members',
    'delete from teams',
    'delete from user_applications',
    'delete from user_platform_document_acceptances',
    'delete from hackathon_terms_documents',
    'delete from platform_documents',
    'delete from hackathon_role_assignments',
    'delete from hackathons',
    'delete from users',
    `insert into users (
      id, auth0_subject, email, display_name, is_platform_admin,
      x_profile_url, linkedin_profile_url, github_profile_url,
      created_at, updated_at, deleted_at
    ) values ${personas.map(userTuple).join(', ')}`,
    `insert into platform_documents (
      id, document_type, version, title, content, published_at, created_at
    ) values
      (${sqlLiteral(fixturePrivacyDocumentId)}, 'privacy_policy', 1, 'Privacy Policy', 'E2E privacy policy', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureTermsDocumentId)}, 'platform_terms', 1, 'Platform Terms', 'E2E platform terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into hackathons (
      id, name, slug, description, background_image_url, banner_image_url, city, address,
      registration_opens_at, registration_closes_at, submission_opens_at, submission_closes_at,
      state, max_team_members, require_x_profile, require_linkedin_profile, require_github_profile,
      current_application_terms_document_id, current_winner_terms_document_id, created_by_user_id,
      created_at, updated_at
    ) values (
      ${sqlLiteral(fixtureHackathonId)},
      'E2E Fixture Hackathon',
      'e2e-fixture-hackathon',
      'Fixture hackathon for authenticated end-to-end coverage.',
      null,
      null,
      'Vienna',
      'Fixture Address',
      '2026-03-20T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      '2026-03-23T12:00:00.000Z',
      '2026-03-25T12:00:00.000Z',
      'registration_open',
      5,
      0,
      0,
      0,
      null,
      null,
      ${sqlLiteral(platformAdminId)},
      ${sqlLiteral(fixtureTimestamp)},
      ${sqlLiteral(fixtureTimestamp)}
    )`,
    `insert into hackathon_terms_documents (
      id, hackathon_id, document_type, version, title, content, published_at, created_at
    ) values
      (${sqlLiteral(fixtureApplicationTermsId)}, ${sqlLiteral(fixtureHackathonId)}, 'application_terms', 1, 'Application Terms', 'E2E application terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)}),
      (${sqlLiteral(fixtureWinnerTermsId)}, ${sqlLiteral(fixtureHackathonId)}, 'winner_terms', 1, 'Winner Terms', 'E2E winner terms', ${sqlLiteral(fixtureTimestamp)}, ${sqlLiteral(fixtureTimestamp)})`,
    `insert into hackathon_role_assignments (
      id, hackathon_id, user_id, role, is_in_judge_pool, created_at
    ) values
      ('role_hackathon_admin_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(hackathonAdminId)}, 'hackathon_admin', 0, ${sqlLiteral(fixtureTimestamp)}),
      ('role_judge_fixture', ${sqlLiteral(fixtureHackathonId)}, ${sqlLiteral(judgeId)}, 'judge', 1, ${sqlLiteral(fixtureTimestamp)})`,
    `update hackathons
      set current_application_terms_document_id = ${sqlLiteral(fixtureApplicationTermsId)},
          current_winner_terms_document_id = ${sqlLiteral(fixtureWinnerTermsId)}
      where id = ${sqlLiteral(fixtureHackathonId)}`,
    'commit'
  ].join(';\n')
}

export function buildPlatformFixtureResetSql(personas: ProvisionedStablePersona[]) {
  return buildFixtureSql(personas)
}

export async function resetPlatformFixtures(
  personas: ProvisionedStablePersona[],
  environment: NodeJS.ProcessEnv = process.env
) {
  const fixtureTarget = resolvePlatformFixtureTarget(environment)
  const fixtureSql = buildFixtureSql(personas)

  if (fixtureTarget.localSqlitePath) {
    mkdirSync(dirname(fixtureTarget.localSqlitePath), { recursive: true })
    rmSync(fixtureTarget.localSqlitePath, { force: true })

    const sqlite = new DatabaseSync(fixtureTarget.localSqlitePath)

    try {
      sqlite.exec(readMigrationSql())
      sqlite.exec(fixtureSql)
    } finally {
      sqlite.close()
    }

    return {
      hackathonId: fixtureHackathonId,
      userIds: personaUserIds
    }
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${fixtureTarget.cloudflareAccountId}/d1/database/${fixtureTarget.cloudflareD1DatabaseId}/query`,
    {
      method: 'POST',
      headers: {
        'authorization': `Bearer ${fixtureTarget.cloudflareApiToken}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sql: fixtureSql
      })
    }
  )

  if (!response.ok) {
    throw new Error(`Cloudflare D1 fixture reset failed with status ${response.status}.`)
  }

  const payload = await response.json() as { success?: boolean, errors?: Array<{ message?: string }> }

  if (payload.success === false) {
    const errorMessage = payload.errors?.map(error => error.message).filter(Boolean).join('; ') || 'Unknown Cloudflare D1 error.'
    throw new Error(`Cloudflare D1 fixture reset failed: ${errorMessage}`)
  }

  return {
    hackathonId: fixtureHackathonId,
    userIds: personaUserIds
  }
}
