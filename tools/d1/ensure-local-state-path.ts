import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const localPersistRoot = resolve(process.cwd(), '.wrangler/state')
const nestedStatePath = resolve(localPersistRoot, 'v3/v3')

if (existsSync(nestedStatePath)) {
  console.error('Found nested local D1 state at .wrangler/state/v3/v3.')
  console.error('This usually means a command used --persist-to .wrangler/state/v3.')
  console.error('Use --persist-to .wrangler/state instead, then remove the nested directory:')
  console.error('rm -rf .wrangler/state/v3/v3')
  process.exit(1)
}
