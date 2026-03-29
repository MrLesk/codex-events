<script setup lang="ts">
import { accountRegisterHref, buildAuthLoginHref } from '~/utils/auth-navigation'

if (useUser().value) {
  await navigateTo(accountRegisterHref, { redirectCode: 301 })
} else {
  await navigateTo(buildAuthLoginHref(accountRegisterHref), { external: true, redirectCode: 302 })
}
</script>
