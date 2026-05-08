<script setup lang="ts">
import { accountRegisterHref, buildAuthLoginHref } from '#shared/domains/accounts/auth-navigation'

useSeoMeta({
  title: 'Signing In | Codex Events',
  description: 'Continue to Codex Events.',
  robots: 'noindex, nofollow'
})

if (useUser().value) {
  await navigateTo(accountRegisterHref, { redirectCode: 301 })
} else {
  await navigateTo(buildAuthLoginHref(accountRegisterHref), { external: true, redirectCode: 302 })
}
</script>
