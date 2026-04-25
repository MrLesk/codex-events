# Database Query Plan Audit

This document records measured `EXPLAIN QUERY PLAN` output for representative release hot paths against the current repository migrations.

## Method

- Runner: `bun tools/d1/query-plan-audit.ts --write`
- Database surface: migrated in-memory D1-compatible SQLite from `tests/support/backend/fake-d1.ts` plus all SQL migrations in `drizzle/`
- Scope: plan shape only; this is not a wall-clock benchmark and it does not add speculative indexes
- Interpretation:
  - `SEARCH ... USING INDEX` means a targeted indexed lookup
  - `SCAN ... USING INDEX` means an ordered index walk
  - `SCAN ...` without an index label means a full table scan
  - `USE TEMP B-TREE FOR ORDER BY` means SQLite had to sort outside the chosen access path

## Measured Findings

### Account hackathons

#### account-applications-by-user

- Owner: `server/api/account/hackathons.get.ts`
- Purpose: Find caller applications ordered by most recent submission.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH user_applications USING INDEX user_applications_user_submitted_idx (user_id=?)`
- Representative SQL:
```sql
select *
from user_applications
where user_id = 'user_1'
order by submitted_at desc
```

#### account-active-memberships-by-user

- Owner: `server/api/account/hackathons.get.ts`
- Purpose: Find active team memberships for the caller.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH team_members USING INDEX team_members_user_active_joined_idx (user_id=?)`
- Representative SQL:
```sql
select *
from team_members
where user_id = 'user_1'
  and left_at is null
order by joined_at desc
```

#### account-role-assignments-by-user

- Owner: `server/api/account/hackathons.get.ts`
- Purpose: Find hackathon role assignments for the caller.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH hackathon_role_assignments USING INDEX hackathon_role_assignments_user_created_idx (user_id=?)`
- Representative SQL:
```sql
select *
from hackathon_role_assignments
where user_id = 'user_1'
order by created_at desc
```

#### account-submissions-by-team

- Owner: `server/api/account/hackathons.get.ts`
- Purpose: Load candidate submissions for the caller team set.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH submissions USING INDEX submissions_team_updated_idx (team_id=?)`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from submissions
where team_id in ('team_1', 'team_2', 'team_3')
order by updated_at desc
```

### Admin applications

#### admin-applications-by-hackathon

- Owner: `server/utils/applications.ts`
- Purpose: List hackathon applications for the admin review screen.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH user_applications USING INDEX user_applications_hackathon_submitted_idx (hackathon_id=?)`
  - `USE TEMP B-TREE FOR LAST TERM OF ORDER BY`
- Representative SQL:
```sql
select *
from user_applications
where hackathon_id = 'hack_1'
order by submitted_at desc, created_at asc
```

### Judging assignments

#### judging-assignments-admin-list

- Owner: `server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts`
- Purpose: List all assignments for hackathon admin and platform admin views.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH judge_assignments USING INDEX judge_assignments_hackathon_stage_status_judge_idx (hackathon_id=?)`
- Representative SQL:
```sql
select *
from judge_assignments
where hackathon_id = 'hack_1'
```

#### judging-assignments-judge-list

- Owner: `server/api/hackathons/[hackathonId]/judging/assignments/index.get.ts`
- Purpose: List active assignments for one judge across review stages.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH judge_assignments USING INDEX judge_assignments_judge_idx (judge_user_id=?)`
- Representative SQL:
```sql
select *
from judge_assignments
where hackathon_id = 'hack_1'
  and judge_user_id = 'judge_1'
  and status in ('assigned', 'judge_started')
```

#### judging-blind-applications-by-hackathon-and-user

- Owner: `server/utils/judging.ts`
- Purpose: Load applications for the team members attached to blind-review assignments.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH user_applications USING INDEX user_applications_hackathon_user_idx (hackathon_id=? AND user_id=?)`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from user_applications
where hackathon_id in ('hack_1', 'hack_2')
  and user_id in ('user_1', 'user_2', 'user_3')
order by submitted_at asc, created_at asc
```

### Public hackathon detail

#### public-hackathon-by-slug

- Owner: `server/utils/hackathon-management.ts`
- Purpose: Resolve a public hackathon by slug while enforcing public visibility states.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH hackathons USING INDEX hackathons_slug_idx (slug=?)`
- Representative SQL:
```sql
select *
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
  )
```

#### public-current-terms-by-id

- Owner: `server/utils/hackathon-management.ts`
- Purpose: Load the current hackathon terms documents by exact id.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH hackathon_terms_documents USING INDEX sqlite_autoindex_hackathon_terms_documents_1 (id=?)`
- Representative SQL:
```sql
select *
from hackathon_terms_documents
where id in ('terms_1', 'terms_2')
```

#### public-tracks-by-hackathon

- Owner: `server/utils/hackathon-management.ts`
- Purpose: List hackathon tracks for public detail rendering.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH hackathon_tracks USING INDEX hackathon_tracks_hackathon_display_order_idx (hackathon_id=?)`
- Representative SQL:
```sql
select *
from hackathon_tracks
where hackathon_id = 'hack_1'
order by display_order asc, created_at asc, id asc
```

### Public projects and winners

#### public-outcome-teams-by-hackathon

- Owner: `server/utils/shortlist.ts`
- Purpose: Load all teams that belong to the completed-outcome hackathon.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH teams USING INDEX teams_hackathon_idx (hackathon_id=?)`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from teams
where hackathon_id = 'hack_1'
order by created_at asc, name asc
```

#### public-outcome-submissions-by-team

- Owner: `server/utils/shortlist.ts`
- Purpose: Load the latest submission candidates for the outcome view team set.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH submissions USING INDEX submissions_team_updated_idx (team_id=?)`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from submissions
where team_id in ('team_1', 'team_2', 'team_3')
order by created_at desc
```

#### public-outcome-assignments-by-submission

- Owner: `server/utils/shortlist.ts`
- Purpose: Load all judging assignments attached to the tracked submissions.
- Measured finding: Measured full scan plus temp sort on the current schema.
- Plan details:
  - `SCAN judge_assignments`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from judge_assignments
where submission_id in ('submission_1', 'submission_2', 'submission_3')
order by created_at desc
```

#### public-outcome-criterion-scores-by-assignment

- Owner: `server/utils/shortlist.ts`
- Purpose: Load criterion scores for the tracked judge assignments.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH judge_criterion_scores USING INDEX judge_criterion_scores_assignment_criterion_idx (judge_assignment_id=?)`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from judge_criterion_scores
where judge_assignment_id in ('assignment_1', 'assignment_2', 'assignment_3')
order by created_at asc
```

#### public-outcome-prize-eligibility-by-team

- Owner: `server/utils/shortlist.ts`
- Purpose: Load frozen winner roster membership snapshots for the outcome team set.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `SEARCH prize_eligibility_snapshots USING INDEX prize_eligibility_snapshots_hackathon_team_user_idx (hackathon_id=? AND team_id=?)`
  - `USE TEMP B-TREE FOR LAST TERM OF ORDER BY`
- Representative SQL:
```sql
select *
from prize_eligibility_snapshots
where hackathon_id = 'hack_1'
  and team_id in ('team_1', 'team_2', 'team_3')
order by team_id asc, created_at asc
```

### Audit logs

#### platform-audit-latest

- Owner: `server/api/audit/index.get.ts`
- Purpose: Load the latest platform-wide audit entries.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SCAN audit_logs USING INDEX audit_logs_created_idx`
- Representative SQL:
```sql
select *
from audit_logs
order by created_at desc
limit 200
```

#### hackathon-audit-latest

- Owner: `server/api/hackathons/[hackathonId]/audit/index.get.ts`
- Purpose: Load the latest hackathon-scoped audit entries via entity and metadata filters.
- Measured finding: Measured temp sort on the current schema.
- Plan details:
  - `MULTI-INDEX OR`
  - `INDEX 1`
  - `SEARCH audit_logs USING INDEX audit_logs_entity_created_idx (entity_type=? AND entity_id=?)`
  - `INDEX 2`
  - `SEARCH audit_logs USING INDEX audit_logs_metadata_hackathon_created_idx (<expr>=?)`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from audit_logs
where (
    entity_type = 'hackathon'
    and entity_id = 'hack_1'
  )
  or json_extract(metadata, '$.hackathonId') = 'hack_1'
order by created_at desc
limit 200
```

### Prize redemptions

#### prize-redemption-team-admin-memberships

- Owner: `server/utils/prize-redemptions.ts`
- Purpose: Find active team-admin memberships before building prize redemption visibility.
- Measured finding: Measured indexed lookup or ordered index walk with no temp sort.
- Plan details:
  - `SEARCH team_members USING INDEX team_members_user_idx (user_id=?)`
- Representative SQL:
```sql
select *
from team_members
where user_id = 'user_1'
  and role = 'admin'
  and left_at is null
```

#### prize-redemption-pending-visible

- Owner: `server/utils/prize-redemptions.ts`
- Purpose: List pending redemptions visible to the current user or their admin teams.
- Measured finding: Measured full scan plus temp sort on the current schema.
- Plan details:
  - `SCAN prize_redemptions`
  - `USE TEMP B-TREE FOR ORDER BY`
- Representative SQL:
```sql
select *
from prize_redemptions
where status = 'pending'
  and (
    user_id = 'user_1'
    or (
      user_id is null
      and team_id in ('team_1', 'team_2')
    )
  )
order by created_at asc
```

## Recommendations

- `account-submissions-by-team` (`server/api/account/hackathons.get.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `admin-applications-by-hackathon` (`server/utils/applications.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `judging-blind-applications-by-hackathon-and-user` (`server/utils/judging.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `public-outcome-teams-by-hackathon` (`server/utils/shortlist.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `public-outcome-submissions-by-team` (`server/utils/shortlist.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `public-outcome-assignments-by-submission` (`server/utils/shortlist.ts`): follow up with the owning query path because the measured plan shows a full scan plus temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `public-outcome-criterion-scores-by-assignment` (`server/utils/shortlist.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `public-outcome-prize-eligibility-by-team` (`server/utils/shortlist.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `hackathon-audit-latest` (`server/api/hackathons/[hackathonId]/audit/index.get.ts`): follow up with the owning query path because the measured plan shows a temp sort. Only add an index or rewrite after validating that this path is still release-critical.
- `prize-redemption-pending-visible` (`server/utils/prize-redemptions.ts`): follow up with the owning query path because the measured plan shows a full scan plus temp sort. Only add an index or rewrite after validating that this path is still release-critical.
