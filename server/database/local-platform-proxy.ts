import { resolve } from 'node:path'

export const localWranglerConfigPath = resolve(process.cwd(), 'wrangler.jsonc')
export const localPlatformPersistPath = resolve(process.cwd(), '.wrangler/state/v3')

type WranglerModule = typeof import('wrangler')

const importWrangler = new Function(
  'specifier',
  'return import(specifier)'
) as (specifier: string) => Promise<WranglerModule>

async function loadWranglerModule() {
  if (process.env.VITEST) {
    return await import('wrangler')
  }

  return await importWrangler('wrangler')
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
