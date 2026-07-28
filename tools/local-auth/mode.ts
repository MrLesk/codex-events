const requiredAuth0Variables = [
  'NUXT_AUTH0_DOMAIN',
  'NUXT_AUTH0_CLIENT_ID',
  'NUXT_AUTH0_CLIENT_SECRET',
  'NUXT_AUTH0_SESSION_SECRET'
] as const

export function shouldUseLocalCodexAuth(
  isDevelopment: boolean,
  environment: NodeJS.ProcessEnv
) {
  return isDevelopment
    && requiredAuth0Variables.some(name => !environment[name]?.trim())
}
