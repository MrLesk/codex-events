import { existsSync } from 'node:fs'
import { resolve } from 'node:path'

const localPersistRoot = resolve(
  process.cwd(),
  process.env.LOCAL_D1_STATE_ROOT?.trim() || '.wrangler/state'
)
const nestedStatePath = resolve(localPersistRoot, 'v3/v3')

if (existsSync(nestedStatePath)) {
  console.error(`Found nested local D1 state at ${nestedStatePath}.`)
  console.error(`This usually means a command used --persist-to ${resolve(localPersistRoot, 'v3')}.`)
  console.error(`Use --persist-to ${localPersistRoot} instead, then remove the nested directory:`)
  console.error(`rm -rf ${nestedStatePath}`)
  process.exit(1)
}
