import { resolve } from 'node:path'

import { getPlatformProxy } from 'wrangler'

export const localWranglerConfigPath = resolve(process.cwd(), 'wrangler.jsonc')
export const localPlatformPersistPath = resolve(process.cwd(), '.wrangler/state/v3')

export async function createLocalPlatformProxy(options?: {
  configPath?: string
  persist?: boolean | { path: string }
}) {
  return await getPlatformProxy({
    configPath: options?.configPath ?? localWranglerConfigPath,
    persist: options?.persist ?? {
      path: localPlatformPersistPath
    }
  })
}
