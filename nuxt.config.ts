// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@auth0/auth0-nuxt',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  colorMode: {
    preference: 'dark',
    fallback: 'dark'
  },

  runtimeConfig: {
    auth0: {
      domain: '',
      clientId: '',
      clientSecret: '',
      sessionSecret: '',
      appBaseUrl: 'http://localhost:3000',
      audience: ''
    },
    database: {
      binding: 'DB',
      localSqlitePath: '.data/local-d1.sqlite'
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
