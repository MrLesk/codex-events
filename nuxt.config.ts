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
    auth0: {
      domain: '',
      clientId: '',
      clientSecret: '',
      sessionSecret: '',
      appBaseUrl: 'http://localhost:3000',
      audience: '',
      managementDomain: '',
      managementClientId: '',
      managementClientSecret: '',
      managementAudience: '',
      databaseConnectionName: '',
      accountLinkChallengeSecret: ''
    },
    resend: {
      apiKey: '',
      fromEmail: '',
      fromName: 'Codex Hackathons',
      replyTo: ''
    },
    applicationReviewEmails: {
      queueBinding: 'APPLICATION_REVIEW_EMAIL_QUEUE',
      queueName: 'codex-hackathons-application-review-email-delivery',
      retryDelaySeconds: 120
    },
    luma: {
      apiKey: '',
      apiBaseUrl: 'https://public-api.luma.com',
      profileBaseUrl: 'https://luma.com',
      queueBinding: 'APPLICATION_LUMA_SYNC_QUEUE',
      queueName: 'codex-hackathons-application-luma-sync',
      retryDelaySeconds: 120
    },
    database: {
      binding: 'DB'
    },
    profileIcons: {
      binding: 'PROFILE_ICONS'
    },
    hackathonImages: {
      binding: 'HACKATHON_IMAGES'
    }
  },
  alias: {
    '#proof-of-execution-links': fileURLToPath(new URL('./shared/proof-of-execution-links.ts', import.meta.url)),
    '#platform-legal': fileURLToPath(new URL('./shared/platform-legal.ts', import.meta.url)),
    '#third-party-notices': fileURLToPath(new URL('./shared/third-party-notices.generated.ts', import.meta.url))
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
