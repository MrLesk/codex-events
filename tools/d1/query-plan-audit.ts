import { writeFile } from 'node:fs/promises'
import { relative, resolve } from 'node:path'

import { createTestD1Database } from '../../tests/support/backend/fake-d1'

interface QueryPlanRow {
  detail: string
}

interface Scenario {
  area: string
  key: string
  owner: string
  purpose: string
  sql: string
}

interface ScenarioResult {
  scenario: Scenario
  details: string[]
  finding: string
  followUpReason: 'full scan' | 'temp sort' | 'full scan plus temp sort' | null
  needsFollowUp: boolean
}

const outputPath = resolve(process.cwd(), 'docs/database-query-plan-audit.md')

const scenarios: Scenario[] = [{
  area: 'Account hackathons',
  key: 'account-applications-by-user',
  owner: 'server/api/account/hackathons.get.ts',
  purpose: 'Find caller applications ordered by most recent submission.',
  sql: `select *
from user_applications
where user_id = 'user_1'
order by submitted_at desc`
}, {
  area: 'Account hackathons',
  key: 'account-active-memberships-by-user',
  owner: 'server/api/account/hackathons.get.ts',
  purpose: 'Find active team memberships for the caller.',
  sql: `select *
from team_members
where user_id = 'user_1'
  and left_at is null
order by joined_at desc`
}, {
  area: 'Account hackathons',
  key: 'account-role-assignments-by-user',
  owner: 'server/api/account/hackathons.get.ts',
  purpose: 'Find hackathon role assignments for the caller.',
  sql: `select *
from hackathon_role_assignments
where user_id = 'user_1'
order by created_at desc`
}, {
  area: 'Account hackathons',
  key: 'account-submissions-by-team',
  owner: 'server/api/account/hackathons.get.ts',
  purpose: 'Load candidate submissions for the caller team set.',
  sql: `select *
from submissions
where team_id in ('team_1', 'team_2', 'team_3')
order by updated_at desc`
}, {
  area: 'Admin applications',
  key: 'admin-applications-by-hackathon',
  owner: 'server/utils/applications.ts',
  purpose: 'List hackathon applications for the admin review screen.',
  sql: `select *
from user_applications
where hackathon_id = 'hack_1'
order by submitted_at desc, created_at asc`
}, {
  area: 'Judging assignments',
  key: 'judging-assignments-admin-list',
  owner: 'server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts',
  purpose: 'List all assignments for hackathon admin and platform admin views.',
  sql: `select *
from judge_assignments
where hackathon_id = 'hack_1'`
}, {
  area: 'Judging assignments',
  key: 'judging-assignments-judge-list',
  owner: 'server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts',
  purpose: 'List active assignments for one judge across review stages.',
  sql: `select *
from judge_assignments
where hackathon_id = 'hack_1'
  and judge_user_id = 'judge_1'
  and status in ('assigned', 'judge_started')`
}, {
  area: 'Judging assignments',
  key: 'judging-blind-applications-by-hackathon-and-user',
  owner: 'server/utils/judging.ts',
  purpose: 'Load applications for the team members attached to blind-review assignments.',
  sql: `select *
from user_applications
where hackathon_id in ('hack_1', 'hack_2')
  and user_id in ('user_1', 'user_2', 'user_3')
order by submitted_at asc, created_at asc`
}, {
  area: 'Public hackathon detail',
  key: 'public-hackathon-by-slug',
  owner: 'server/utils/hackathon-management.ts',
  purpose: 'Resolve a public hackathon by slug while enforcing public visibility states.',
  sql: `select *
from hackathons
where slug = 'public-slug'
  and (
    state = 'registration_open'
    or state = 'submission_open'
    or state = 'judging_preparation'
    or state = 'blind_review'
    or state = 'shortlist'
    or state = 'pitch'
    or state = 'pitch_review'
    or state = 'final_deliberation'
    or state = 'winners_announced'
    or state = 'completed'
  )`
}, {
  area: 'Public hackathon detail',
  key: 'public-current-terms-by-id',
  owner: 'server/utils/hackathon-management.ts',
  purpose: 'Load the current hackathon terms documents by exact id.',
  sql: `select *
from hackathon_terms_documents
where id in ('terms_1', 'terms_2')`
}, {
  area: 'Public hackathon detail',
  key: 'public-tracks-by-hackathon',
  owner: 'server/utils/hackathon-management.ts',
  purpose: 'List hackathon tracks for public detail rendering.',
  sql: `select *
from hackathon_tracks
where hackathon_id = 'hack_1'
order by display_order asc, created_at asc, id asc`
}, {
  area: 'Public projects and winners',
  key: 'public-outcome-teams-by-hackathon',
  owner: 'server/utils/shortlist.ts',
  purpose: 'Load all teams that belong to the completed-outcome hackathon.',
  sql: `select *
from teams
where hackathon_id = 'hack_1'
order by created_at asc, name asc`
}, {
  area: 'Public projects and winners',
  key: 'public-outcome-submissions-by-team',
  owner: 'server/utils/shortlist.ts',
  purpose: 'Load the latest submission candidates for the outcome view team set.',
  sql: `select *
from submissions
where team_id in ('team_1', 'team_2', 'team_3')
order by created_at desc`
}, {
  area: 'Public projects and winners',
  key: 'public-outcome-assignments-by-submission',
  owner: 'server/utils/shortlist.ts',
  purpose: 'Load all judging assignments attached to the tracked submissions.',
  sql: `select *
from judge_assignments
where submission_id in ('submission_1', 'submission_2', 'submission_3')
order by created_at desc`
}, {
  area: 'Public projects and winners',
  key: 'public-outcome-criterion-scores-by-assignment',
  owner: 'server/utils/shortlist.ts',
  purpose: 'Load criterion scores for the tracked judge assignments.',
  sql: `select *
from judge_criterion_scores
where judge_assignment_id in ('assignment_1', 'assignment_2', 'assignment_3')
order by created_at asc`
}, {
  area: 'Public projects and winners',
  key: 'public-outcome-prize-eligibility-by-team',
  owner: 'server/utils/shortlist.ts',
  purpose: 'Load frozen winner roster membership snapshots for the outcome team set.',
  sql: `select *
from prize_eligibility_snapshots
where hackathon_id = 'hack_1'
  and team_id in ('team_1', 'team_2', 'team_3')
order by team_id asc, created_at asc`
}, {
  area: 'Audit logs',
  key: 'platform-audit-latest',
  owner: 'server/api/audit/index.get.ts',
  purpose: 'Load the latest platform-wide audit entries.',
  sql: `select *
from audit_logs
order by created_at desc
limit 200`
}, {
  area: 'Audit logs',
  key: 'hackathon-audit-latest',
  owner: 'server/api/hackathons/[hackathonId]/audit/index.get.ts',
  purpose: 'Load the latest hackathon-scoped audit entries via entity and metadata filters.',
  sql: `select *
from audit_logs
where (
    entity_type = 'hackathon'
    and entity_id = 'hack_1'
  )
  or json_extract(metadata, '$.hackathonId') = 'hack_1'
order by created_at desc
limit 200`
}, {
  area: 'Prize redemptions',
  key: 'prize-redemption-team-admin-memberships',
  owner: 'server/utils/prize-redemptions.ts',
  purpose: 'Find active team-admin memberships before building prize redemption visibility.',
  sql: `select *
from team_members
where user_id = 'user_1'
  and role = 'admin'
  and left_at is null`
}, {
  area: 'Prize redemptions',
  key: 'prize-redemption-pending-visible',
  owner: 'server/utils/prize-redemptions.ts',
  purpose: 'List pending redemptions visible to the current user or their admin teams.',
  sql: `select *
from prize_redemptions
where status = 'pending'
  and (
    user_id = 'user_1'
    or (
      user_id is null
      and team_id in ('team_1', 'team_2')
    )
  )
order by created_at asc`
}]

function formatInlineCode(value: string) {
  return `\`${value.replaceAll('`', '\\`')}\``
}

function classifyPlan(details: string[]) {
  const hasTempSort = details.some(detail => detail.includes('USE TEMP B-TREE'))
  const fullScanDetails = details.filter(detail =>
    detail.startsWith('SCAN ')
    && !detail.includes('USING INDEX')
    && !detail.includes('USING COVERING INDEX')
  )
  const hasMultiIndexOr = details.some(detail => detail.includes('MULTI-INDEX OR'))

  if (hasTempSort && fullScanDetails.length > 0) {
    return {
      finding: 'Measured full scan plus temp sort on the current schema.',
      followUpReason: 'full scan plus temp sort' as const,
      needsFollowUp: true
    }
  }

  if (fullScanDetails.length > 0) {
    return {
      finding: 'Measured full table scan on the current schema.',
      followUpReason: 'full scan' as const,
      needsFollowUp: true
    }
  }

  if (hasTempSort) {
    return {
      finding: 'Measured temp sort on the current schema.',
      followUpReason: 'temp sort' as const,
      needsFollowUp: true
    }
  }

  if (hasMultiIndexOr) {
    return {
      finding: 'Measured multi-index OR plan with no temp sort.',
      followUpReason: null,
      needsFollowUp: false
    }
  }

  return {
    finding: 'Measured indexed lookup or ordered index walk with no temp sort.',
    followUpReason: null,
    needsFollowUp: false
  }
}

function renderMarkdown(results: ScenarioResult[]) {
  const groupedResults = new Map<string, ScenarioResult[]>()

  for (const result of results) {
    const areaResults = groupedResults.get(result.scenario.area) ?? []
    areaResults.push(result)
    groupedResults.set(result.scenario.area, areaResults)
  }

  const recommendations = results.filter(result => result.needsFollowUp)

  const sections = [
    '# Database Query Plan Audit',
    '',
    'This document records measured `EXPLAIN QUERY PLAN` output for representative release hot paths against the current repository migrations.',
    '',
    '## Method',
    '',
    '- Runner: `bun tools/d1/query-plan-audit.ts --write`',
    '- Database surface: migrated in-memory D1-compatible SQLite from `tests/support/backend/fake-d1.ts` plus all SQL migrations in `drizzle/`',
    '- Scope: plan shape only; this is not a wall-clock benchmark and it does not add speculative indexes',
    '- Interpretation:',
    '  - `SEARCH ... USING INDEX` means a targeted indexed lookup',
    '  - `SCAN ... USING INDEX` means an ordered index walk',
    '  - `SCAN ...` without an index label means a full table scan',
    '  - `USE TEMP B-TREE FOR ORDER BY` means SQLite had to sort outside the chosen access path',
    '',
    '## Measured Findings',
    ''
  ]

  for (const [area, areaResults] of groupedResults) {
    sections.push(`### ${area}`, '')

    for (const result of areaResults) {
      sections.push(`#### ${result.scenario.key}`, '')
      sections.push(`- Owner: ${formatInlineCode(result.scenario.owner)}`)
      sections.push(`- Purpose: ${result.scenario.purpose}`)
      sections.push(`- Measured finding: ${result.finding}`)
      sections.push('- Plan details:')

      for (const detail of result.details) {
        sections.push(`  - ${formatInlineCode(detail)}`)
      }

      sections.push('- Representative SQL:')
      sections.push('```sql')
      sections.push(result.scenario.sql)
      sections.push('```')
      sections.push('')
    }
  }

  sections.push('## Recommendations', '')

  if (recommendations.length === 0) {
    sections.push('- No owner-scoped follow-up is recommended from the current measured plans.')
  } else {
    for (const result of recommendations) {
      sections.push(
        `- ${formatInlineCode(result.scenario.key)} (${formatInlineCode(result.scenario.owner)}): `
        + `follow up with the owning query path because the measured plan shows a ${result.followUpReason}. `
        + 'Only add an index or rewrite after validating that this path is still release-critical.'
      )
    }
  }

  return `${sections.join('\n')}\n`
}

async function runAudit() {
  const database = createTestD1Database()

  try {
    const results: ScenarioResult[] = []

    for (const scenario of scenarios) {
      const planRows = await database.prepare(`EXPLAIN QUERY PLAN ${scenario.sql}`).all<QueryPlanRow>()
      const details = planRows.results.map(row => row.detail)
      const classification = classifyPlan(details)

      results.push({
        scenario,
        details,
        finding: classification.finding,
        followUpReason: classification.followUpReason,
        needsFollowUp: classification.needsFollowUp
      })
    }

    return renderMarkdown(results)
  } finally {
    await database.close()
  }
}

async function main() {
  const markdown = await runAudit()

  if (process.argv.includes('--write')) {
    await writeFile(outputPath, markdown, 'utf8')
    console.log(`Wrote ${relative(process.cwd(), outputPath)}`)
    return
  }

  process.stdout.write(markdown)
}

await main()
