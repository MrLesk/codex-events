import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./app', import.meta.url)),
      '#server': fileURLToPath(new URL('./server', import.meta.url)),
      '#shared': fileURLToPath(new URL('./shared', import.meta.url)),
      '#proof-of-execution-links': fileURLToPath(new URL('./shared/proof-of-execution-links.ts', import.meta.url)),
      '#platform-legal': fileURLToPath(new URL('./shared/platform-legal.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
    fileParallelism: false,
    maxWorkers: 1
  }
})
