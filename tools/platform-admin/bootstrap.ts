import 'dotenv/config'

import { and, eq, isNull } from 'drizzle-orm'

import { buildAuditLogInsert } from '../../server/database/audit-log'
import { createDatabase, type D1DatabaseBinding } from '../../server/database/client'
import { createLocalPlatformProxy } from '../../server/database/local-platform-proxy'
import {
  hackathonRoleAssignments,
  users
} from '../../server/database/schema'

type CommandMode = 'apply' | 'check'

interface ScriptArgs {
  mode: CommandMode
  email: string | null
  auth0Subject: string | null
  bindingName: string
}

interface BootstrapAssessment {
  userIsPlatformAdmin: boolean
  missingHackathonAdminAssignmentHackathonIds: string[]
  nonAdminHackathonAssignments: Array<{
    assignmentId: string
    hackathonId: string
    role: typeof hackathonRoleAssignments.$inferSelect.role
    isInJudgePool: boolean
  }>
}

export function getUsageMessage() {
  return `Usage: bun tools/platform-admin/bootstrap.ts <apply|check> (--email <email> | --subject <auth0-subject>) [--binding <binding-name>]

Examples:
- bun tools/platform-admin/bootstrap.ts check --email leskcorp@gmail.com
- bun tools/platform-admin/bootstrap.ts apply --email leskcorp@gmail.com
- bun tools/platform-admin/bootstrap.ts apply --subject auth0|123456

Optional:
- --binding <binding-name> (default: NUXT_DATABASE_BINDING or DB)
`
}

export function parseCommandMode(argument: string | undefined): CommandMode {
  if (argument === 'apply' || argument === 'check') {
    return argument
  }

  throw new Error(getUsageMessage())
}

export function parseScriptArgs(argv: string[]): ScriptArgs {
  const mode = parseCommandMode(argv[0])
  let email: string | null = null
  let auth0Subject: string | null = null
  let bindingName = (process.env.NUXT_DATABASE_BINDING ?? 'DB').trim() || 'DB'

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    const nextToken = argv[index + 1]

    if (token === '--email') {
      if (!nextToken?.trim()) {
        throw new Error('Missing value for --email.')
      }

      email = nextToken.trim()
      index += 1
      continue
    }

    if (token === '--subject') {
      if (!nextToken?.trim()) {
        throw new Error('Missing value for --subject.')
      }

      auth0Subject = nextToken.trim()
      index += 1
      continue
    }

    if (token === '--binding') {
      if (!nextToken?.trim()) {
        throw new Error('Missing value for --binding.')
      }

      bindingName = nextToken.trim()
      index += 1
      continue
    }

    throw new Error(`Unknown argument: ${token}\n\n${getUsageMessage()}`)
  }

  if (!email && !auth0Subject) {
    throw new Error('Provide either --email or --subject.')
  }

  if (email && auth0Subject) {
    throw new Error('Provide only one target identifier: --email or --subject.')
  }

  return {
    mode,
    email,
    auth0Subject,
    bindingName
  }
}

async function resolveTargetUser(
  database: ReturnType<typeof createDatabase>,
  input: { email: string | null, auth0Subject: string | null }
) {
  const user = input.email
    ? await database.query.users.findFirst({
        where: and(
          eq(users.email, input.email),
          isNull(users.deletedAt)
        )
      })
    : await database.query.users.findFirst({
        where: and(
          eq(users.auth0Subject, input.auth0Subject!),
          isNull(users.deletedAt)
        )
      })

  if (!user) {
    const identifier = input.email
      ? `email "${input.email}"`
      : `subject "${input.auth0Subject}"`

    throw new Error(`No active platform user was found for ${identifier}.`)
  }

  return user
}

async function assessBootstrapState(
  database: ReturnType<typeof createDatabase>,
  userId: string
): Promise<BootstrapAssessment> {
  const [hackathonRows, assignmentRows] = await Promise.all([
    database.query.hackathons.findMany({
      columns: {
        id: true
      }
    }),
    database.query.hackathonRoleAssignments.findMany({
      where: eq(hackathonRoleAssignments.userId, userId),
      columns: {
        id: true,
        hackathonId: true,
        role: true,
        isInJudgePool: true
      }
    })
  ])

  const user = await database.query.users.findFirst({
    columns: {
      isPlatformAdmin: true
    },
    where: eq(users.id, userId)
  })

  if (!user) {
    throw new Error(`The target platform user "${userId}" could not be loaded.`)
  }

  const assignmentByHackathonId = new Map(
    assignmentRows.map(assignment => [assignment.hackathonId, assignment] as const)
  )

  const missingHackathonAdminAssignmentHackathonIds: string[] = []
  const nonAdminHackathonAssignments: BootstrapAssessment['nonAdminHackathonAssignments'] = []

  for (const hackathon of hackathonRows) {
    const assignment = assignmentByHackathonId.get(hackathon.id)

    if (!assignment) {
      missingHackathonAdminAssignmentHackathonIds.push(hackathon.id)
      continue
    }

    if (assignment.role !== 'hackathon_admin') {
      nonAdminHackathonAssignments.push({
        assignmentId: assignment.id,
        hackathonId: assignment.hackathonId,
        role: assignment.role,
        isInJudgePool: assignment.isInJudgePool
      })
    }
  }

  return {
    userIsPlatformAdmin: user.isPlatformAdmin,
    missingHackathonAdminAssignmentHackathonIds,
    nonAdminHackathonAssignments
  }
}

export async function run() {
  const scriptArgs = parseScriptArgs(process.argv.slice(2))
  const proxy = await createLocalPlatformProxy()

  try {
    const binding = proxy.env[scriptArgs.bindingName] as D1DatabaseBinding | undefined

    if (!binding) {
      throw new Error(
        `The D1 binding "${scriptArgs.bindingName}" was not found in the local Wrangler platform proxy.`
      )
    }

    const database = createDatabase(binding)
    const targetUser = await resolveTargetUser(database, {
      email: scriptArgs.email,
      auth0Subject: scriptArgs.auth0Subject
    })
    const before = await assessBootstrapState(database, targetUser.id)
    const isCompliantBefore = before.userIsPlatformAdmin
      && before.missingHackathonAdminAssignmentHackathonIds.length === 0
      && before.nonAdminHackathonAssignments.length === 0

    if (scriptArgs.mode === 'check') {
      const summary = {
        mode: scriptArgs.mode,
        targetUser: {
          id: targetUser.id,
          email: targetUser.email,
          auth0Subject: targetUser.auth0Subject
        },
        compliant: isCompliantBefore,
        before
      }

      console.info(JSON.stringify(summary, null, 2))

      if (!isCompliantBefore) {
        process.exitCode = 1
      }

      return
    }

    const executedAt = new Date().toISOString()
    let userPromoted = false
    let createdHackathonAdminAssignments = 0
    let updatedHackathonAdminAssignments = 0
    const updates = []

    if (!before.userIsPlatformAdmin) {
      userPromoted = true
      updates.push(
        database
          .update(users)
          .set({
            isPlatformAdmin: true,
            updatedAt: executedAt
          })
          .where(eq(users.id, targetUser.id))
      )
    }

    for (const hackathonId of before.missingHackathonAdminAssignmentHackathonIds) {
      createdHackathonAdminAssignments += 1
      updates.push(
        database.insert(hackathonRoleAssignments).values({
          id: crypto.randomUUID(),
          hackathonId,
          userId: targetUser.id,
          role: 'hackathon_admin',
          isInJudgePool: false,
          createdAt: executedAt
        })
      )
    }

    for (const assignment of before.nonAdminHackathonAssignments) {
      updatedHackathonAdminAssignments += 1
      updates.push(
        database
          .update(hackathonRoleAssignments)
          .set({
            role: 'hackathon_admin'
          })
          .where(eq(hackathonRoleAssignments.id, assignment.assignmentId))
      )
    }

    const appliedChanges = userPromoted
      || createdHackathonAdminAssignments > 0
      || updatedHackathonAdminAssignments > 0

    if (appliedChanges) {
      updates.push(
        buildAuditLogInsert(database, {
          actorUserId: null,
          entityType: 'user',
          entityId: targetUser.id,
          action: 'platform_admin.bootstrap_granted',
          metadata: {
            email: targetUser.email,
            auth0Subject: targetUser.auth0Subject,
            userPromoted,
            createdHackathonAdminAssignments,
            updatedHackathonAdminAssignments
          },
          createdAt: executedAt
        }).query
      )
    }

    if (updates.length > 0) {
      await database.batch(updates)
    }

    const after = await assessBootstrapState(database, targetUser.id)
    const isCompliantAfter = after.userIsPlatformAdmin
      && after.missingHackathonAdminAssignmentHackathonIds.length === 0
      && after.nonAdminHackathonAssignments.length === 0

    const summary = {
      mode: scriptArgs.mode,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        auth0Subject: targetUser.auth0Subject
      },
      before,
      after,
      applied: {
        userPromoted,
        createdHackathonAdminAssignments,
        updatedHackathonAdminAssignments,
        wroteAuditLog: appliedChanges
      },
      compliant: isCompliantAfter
    }

    console.info(JSON.stringify(summary, null, 2))

    if (!isCompliantAfter) {
      process.exitCode = 1
    }
  } finally {
    const maybeDisposable = proxy as {
      dispose?: () => Promise<void> | void
    }

    await maybeDisposable.dispose?.()
  }
}

if (import.meta.main) {
  run().catch((error) => {
    const message = error instanceof Error ? error.message : String(error)
    console.error(message)
    process.exitCode = 1
  })
}
