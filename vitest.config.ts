import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '#server': fileURLToPath(new URL('./server', import.meta.url)),
      '#proof-of-execution-links': fileURLToPath(new URL('./shared/proof-of-execution-links.ts', import.meta.url)),
      '#platform-legal': fileURLToPath(new URL('./shared/platform-legal.ts', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts']
  }
})
