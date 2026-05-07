import 'dotenv/config'

import { readFileSync } from 'node:fs'

import { z } from 'zod'

import { createDatabase, type D1DatabaseBinding } from '../../server/database/client'
import { createLocalPlatformProxy } from '../../server/database/local-platform-proxy'
import {
  createPlatformDocumentVersion,
  getCurrentPlatformDocument
} from '../../server/domains/platform/documents'
import {
  getPlatformLegalSettings,
  platformLegalSettingsBodySchema,
  serializePlatformLegalSettings,
  upsertPlatformLegalSettings
} from '../../server/domains/platform/legal-settings'

type CommandMode = 'apply' | 'check'

const platformLegalBootstrapConfigSchema = platformLegalSettingsBodySchema.extend({
  documents: z.object({
    privacy_policy: z.object({
      title: z.string().trim().min(1),
      content: z.string().trim().min(1),
      publishedAt: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Expected an ISO-8601 timestamp.').optional()
    }),
    platform_terms: z.object({
      title: z.string().trim().min(1),
      content: z.string().trim().min(1),
      publishedAt: z.string().refine(value => !Number.isNaN(Date.parse(value)), 'Expected an ISO-8601 timestamp.').optional()
    })
  })
})

type PlatformLegalBootstrapConfig = z.infer<typeof platformLegalBootstrapConfigSchema>

interface ScriptArgs {
  mode: CommandMode
  configPath: string
  bindingName: string
}

export function getUsageMessage() {
  return `Usage: bun tools/platform-legal/bootstrap.ts <apply|check> --config <legal-config.json> [--binding <binding-name>]

Examples:
- bun tools/platform-legal/bootstrap.ts check --config ./legal/platform-legal.json
- bun tools/platform-legal/bootstrap.ts apply --config ./legal/platform-legal.json

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
  let configPath = ''
  let bindingName = (process.env.NUXT_DATABASE_BINDING ?? 'DB').trim() || 'DB'

  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index]
    const nextToken = argv[index + 1]

    if (token === '--config') {
      if (!nextToken?.trim()) {
        throw new Error('Missing value for --config.')
      }

      configPath = nextToken.trim()
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

  if (!configPath) {
    throw new Error('Provide --config with the platform legal bootstrap JSON file.')
  }

  return {
    mode,
    configPath,
    bindingName
  }
}

export function readPlatformLegalBootstrapConfig(path: string): PlatformLegalBootstrapConfig {
  const parsedJson = JSON.parse(readFileSync(path, 'utf8')) as unknown

  return platformLegalBootstrapConfigSchema.parse(parsedJson)
}

function documentsMatch(
  document: Awaited<ReturnType<typeof getCurrentPlatformDocument>>,
  expected: { title: string, content: string }
) {
  return Boolean(document)
    && document?.title === expected.title
    && document.content === expected.content
}

export async function run() {
  const scriptArgs = parseScriptArgs(process.argv.slice(2))
  const config = readPlatformLegalBootstrapConfig(scriptArgs.configPath)
  const proxy = await createLocalPlatformProxy()

  try {
    const binding = proxy.env[scriptArgs.bindingName] as D1DatabaseBinding | undefined

    if (!binding) {
      throw new Error(
        `The D1 binding "${scriptArgs.bindingName}" was not found in the local Wrangler platform proxy.`
      )
    }

    const database = createDatabase(binding)
    const beforeSettings = await getPlatformLegalSettings(database)
    const beforePrivacyPolicy = await getCurrentPlatformDocument(database, 'privacy_policy')
    const beforePlatformTerms = await getCurrentPlatformDocument(database, 'platform_terms')
    const settingsConfigured = Boolean(beforeSettings)
    const privacyPolicyConfigured = documentsMatch(beforePrivacyPolicy, config.documents.privacy_policy)
    const platformTermsConfigured = documentsMatch(beforePlatformTerms, config.documents.platform_terms)

    if (scriptArgs.mode === 'apply') {
      await upsertPlatformLegalSettings(database, config, null)

      if (!beforePrivacyPolicy) {
        await createPlatformDocumentVersion(database, {
          documentType: 'privacy_policy',
          title: config.documents.privacy_policy.title,
          content: config.documents.privacy_policy.content,
          publishedAt: config.documents.privacy_policy.publishedAt,
          actorUserId: null
        })
      }

      if (!beforePlatformTerms) {
        await createPlatformDocumentVersion(database, {
          documentType: 'platform_terms',
          title: config.documents.platform_terms.title,
          content: config.documents.platform_terms.content,
          publishedAt: config.documents.platform_terms.publishedAt,
          actorUserId: null
        })
      }
    }

    const afterSettings = await getPlatformLegalSettings(database)
    const afterPrivacyPolicy = await getCurrentPlatformDocument(database, 'privacy_policy')
    const afterPlatformTerms = await getCurrentPlatformDocument(database, 'platform_terms')
    const summary = {
      mode: scriptArgs.mode,
      legalSettingsConfigured: Boolean(afterSettings),
      privacyPolicyConfigured: documentsMatch(afterPrivacyPolicy, config.documents.privacy_policy),
      platformTermsConfigured: documentsMatch(afterPlatformTerms, config.documents.platform_terms),
      existingDocumentsMatchedConfig: {
        privacy_policy: privacyPolicyConfigured,
        platform_terms: platformTermsConfigured
      },
      before: {
        legalSettingsConfigured: settingsConfigured,
        privacyPolicyVersion: beforePrivacyPolicy?.version ?? null,
        platformTermsVersion: beforePlatformTerms?.version ?? null
      },
      after: {
        legalSettings: afterSettings ? serializePlatformLegalSettings(afterSettings) : null,
        privacyPolicyVersion: afterPrivacyPolicy?.version ?? null,
        platformTermsVersion: afterPlatformTerms?.version ?? null
      }
    }
    const compliant = summary.legalSettingsConfigured
      && summary.privacyPolicyConfigured
      && summary.platformTermsConfigured

    console.info(JSON.stringify({
      ...summary,
      compliant
    }, null, 2))

    if (!compliant) {
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
