import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, test } from 'vitest'
import { z } from 'zod'

const pluginRoot = resolve(import.meta.dirname, '../../agent-plugin/codex-events')

const pluginManifestSchema = z.object({
  $schema: z.literal('https://agent-plugins.org/schemas/1.0.0/plugin.schema.json'),
  name: z.string().regex(/^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/).max(64),
  version: z.string().optional(),
  description: z.string().optional(),
  author: z.object({
    name: z.string().optional(),
    email: z.string().optional(),
    url: z.string().optional()
  }).strict().optional(),
  homepage: z.string().optional(),
  repository: z.string().optional(),
  license: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  extensions: z.record(z.string(), z.record(z.string(), z.unknown())).optional()
}).strict()

const mcpManifestSchema = z.object({
  $schema: z.literal('https://agent-plugins.org/schemas/1.0.0/mcp.schema.json'),
  mcpServers: z.record(z.string(), z.object({
    type: z.literal('streamable-http'),
    url: z.literal('http://localhost:3000/mcp'),
    headers: z.record(z.string(), z.string()).optional()
  }).strict())
}).strict()

describe('Agent Plugins v1 package', () => {
  test('uses the standard plugin root without legacy Codex packaging', () => {
    expect(existsSync(resolve(pluginRoot, '.codex-plugin'))).toBe(false)
    const manifest = pluginManifestSchema.parse(JSON.parse(
      readFileSync(resolve(pluginRoot, 'plugin.json'), 'utf8')
    ))

    expect(manifest).toMatchObject({
      name: 'codex-events',
      repository: 'https://github.com/globodex/codex-events',
      license: 'MIT'
    })
    expect(manifest.description).not.toMatch(/local|MCP|role-aware/i)
  })

  test('connects only to the local MCP endpoint without packaged credentials', () => {
    const manifest = mcpManifestSchema.parse(JSON.parse(
      readFileSync(resolve(pluginRoot, 'mcp.json'), 'utf8')
    ))

    expect(manifest.mcpServers['codex-events']?.headers).toBeUndefined()
  })

  test('ships one concise skill with confirmation and action-absence boundaries', () => {
    const skill = readFileSync(resolve(pluginRoot, 'skills/codex-events/SKILL.md'), 'utf8')

    expect(skill).toContain('name: codex-events')
    expect(skill).toContain('A missing action means the user does not currently have that capability')
    expect(skill).toContain('events_upsert')
    expect(skill).toContain('explicitly ask the user to confirm creation')
  })
})
