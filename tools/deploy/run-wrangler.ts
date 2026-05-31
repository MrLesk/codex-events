import 'dotenv/config'

import { runWranglerCommand } from './wrangler-command'

if (import.meta.main) {
  try {
    const args = process.argv.slice(2)

    if (args.length === 0) {
      throw new Error('Usage: bun tools/deploy/run-wrangler.ts <wrangler-args...>')
    }

    const result = await runWranglerCommand(args)
    process.stdout.write(result.stdout)
    process.stderr.write(result.stderr)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to run Wrangler.'
    process.stderr.write(`${message}\n`)
    process.exitCode = 1
  }
}
