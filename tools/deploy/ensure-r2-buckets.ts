import 'dotenv/config'

import {
  parseDeployTarget,
  resolveDeployResourceNames,
  type DeployTarget,
  type EnvironmentValues
} from './generate-wrangler-config'
import { createWranglerCommandRunner, type CommandResult, type CommandRunner } from './wrangler-command'

export type { CommandRunner } from './wrangler-command'

export interface R2BucketInfo {
  name: string
}

export interface EnsuredR2Bucket {
  binding: 'PROFILE_ICONS' | 'EVENT_IMAGES'
  bucketName: string
  created: boolean
}

export function parseR2BucketInfoOutput(output: string): R2BucketInfo {
  const payload = JSON.parse(output) as unknown

  if (
    !payload
    || typeof payload !== 'object'
    || !('name' in payload)
    || typeof payload.name !== 'string'
  ) {
    throw new Error('Wrangler R2 bucket info JSON output contained an unexpected bucket record.')
  }

  return {
    name: payload.name
  }
}

async function readR2BucketInfo(runner: CommandRunner, bucketName: string) {
  return runner('bunx', ['wrangler', 'r2', 'bucket', 'info', bucketName, '--json'])
}

async function findR2Bucket(runner: CommandRunner, bucketName: string) {
  let result: CommandResult

  try {
    result = await readR2BucketInfo(runner, bucketName)
  } catch {
    return null
  }

  const bucket = parseR2BucketInfoOutput(result.stdout)

  if (bucket.name !== bucketName) {
    throw new Error(`Wrangler returned R2 bucket "${bucket.name}" while looking for "${bucketName}".`)
  }

  return bucket
}

async function ensureR2Bucket(runner: CommandRunner, bucket: Omit<EnsuredR2Bucket, 'created'>): Promise<EnsuredR2Bucket> {
  const existingBucket = await findR2Bucket(runner, bucket.bucketName)

  if (existingBucket) {
    return {
      ...bucket,
      created: false
    }
  }

  try {
    await runner('bunx', ['wrangler', 'r2', 'bucket', 'create', bucket.bucketName])
  } catch (error) {
    const bucketAfterFailedCreate = await findR2Bucket(runner, bucket.bucketName)

    if (bucketAfterFailedCreate) {
      return {
        ...bucket,
        created: false
      }
    }

    throw error
  }

  const createdBucket = await findR2Bucket(runner, bucket.bucketName)

  if (!createdBucket) {
    throw new Error(`R2 bucket "${bucket.bucketName}" was created, but Wrangler could not read it afterward.`)
  }

  return {
    ...bucket,
    created: true
  }
}

export async function ensureDeployR2Buckets(options: {
  target: DeployTarget
  environment?: EnvironmentValues
  runner?: CommandRunner
}): Promise<EnsuredR2Bucket[]> {
  const environment = options.environment ?? process.env
  const runner = options.runner ?? createWranglerCommandRunner(environment)
  const resourceNames = resolveDeployResourceNames(options.target, environment)

  return Promise.all([
    ensureR2Bucket(runner, {
      binding: 'PROFILE_ICONS',
      bucketName: resourceNames.profileIconsBucket
    }),
    ensureR2Bucket(runner, {
      binding: 'EVENT_IMAGES',
      bucketName: resourceNames.eventImagesBucket
    })
  ])
}

if (import.meta.main) {
  try {
    const target = parseDeployTarget(process.argv[2])
    const buckets = await ensureDeployR2Buckets({ target })

    for (const bucket of buckets) {
      process.stdout.write(`${bucket.created ? 'Created' : 'Found'} R2 bucket ${bucket.bucketName} for ${bucket.binding}.\n`)
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to ensure R2 buckets.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
