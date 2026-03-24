import { createRequire } from 'node:module'
import { resolve } from 'node:path'

export const localWranglerConfigPath = resolve(process.cwd(), 'wrangler.jsonc')
export const localPlatformPersistPath = resolve(process.cwd(), '.wrangler/state/v3')

type WranglerModule = typeof import('wrangler')
const require = createRequire(import.meta.url)

async function loadWranglerModule() {
  return require('wrangler') as WranglerModule
}

export async function createLocalPlatformProxy(options?: {
  configPath?: string
  persist?: boolean | { path: string }
}) {
  const { getPlatformProxy } = await loadWranglerModule()

  return await getPlatformProxy({
    configPath: options?.configPath ?? localWranglerConfigPath,
    persist: options?.persist ?? {
      path: localPlatformPersistPath
    }
  })
}
