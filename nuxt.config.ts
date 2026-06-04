import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({

  modules: [
    '@nuxt/eslint',
    '@auth0/auth0-nuxt',
    '@nuxt/icon',
    'shadcn-nuxt'
  ],

  devtools: {
    enabled: process.env.NODE_ENV !== 'production'
  },

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    firstPlatformAdminEmail: '',
    auth0: {
      domain: '',
      clientId: '',
      clientSecret: '',
      sessionSecret: '',
      appBaseUrl: 'http://localhost:3000',
      databaseConnectionName: '',
      accountLinkChallengeSecret: ''
    },
    outboundEmail: {
      binding: 'EMAIL',
      fromEmail: '',
      fromName: 'Codex Events',
      replyTo: ''
    },
    applicationReviewEmails: {
      queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE',
      queueName: 'codex-events-dev-application-review-email-delivery',
      retryDelaySeconds: 120
    },
    eventOutcomeEmails: {
      queueBinding: 'EVENT_OUTCOME_EMAIL_QUEUE',
      queueName: 'codex-events-dev-event-outcome-email-delivery',
      retryDelaySeconds: 120
    },
    luma: {
      apiBaseUrl: 'https://public-api.luma.com',
      profileBaseUrl: 'https://luma.com',
      queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE',
      queueName: 'codex-events-dev-application-luma-sync',
      retryDelaySeconds: 120
    },
    database: {
      binding: 'DB'
    },
    profileIcons: {
      binding: 'PROFILE_ICONS'
    },
    eventImages: {
      binding: 'EVENT_IMAGES'
    }
  },
  alias: {
    '#ai-knowledge': fileURLToPath(new URL('./shared/domains/applications/ai-knowledge.ts', import.meta.url)),
    '#proof-of-execution-links': fileURLToPath(new URL('./shared/domains/applications/proof-of-execution-links.ts', import.meta.url))
  },

  routeRules: {
    '/account': { appLayout: 'profile' },
    '/account/**': { appLayout: 'profile' },
    '/admin/**': { appLayout: 'profile' },
    '/prize-redemptions': { appLayout: 'profile' },
    '/prize-redemptions/**': { appLayout: 'profile' }
  },

  sourcemap: {
    client: process.env.NODE_ENV !== 'production',
    server: process.env.NODE_ENV !== 'production'
  },

  compatibilityDate: '2025-01-15',

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: [
        '@vue/devtools-core',
        '@vue/devtools-kit',
        'lucide-vue-next',
        'clsx',
        'tailwind-merge',
        'class-variance-authority',
        'vue-sonner',
        'reka-ui',
        '@vueuse/core',
        'markdown-it'
      ]
    }
  },

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  shadcn: {
    prefix: '',
    componentDir: '~/components/ui'
  }
})
