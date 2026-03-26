<script setup lang="ts">
import { buildAuthLoginHref } from '~/utils/auth-navigation'

if (useUser().value) {
  await navigateTo('/account/settings', { redirectCode: 301 })
} else {
  await navigateTo(buildAuthLoginHref('/account/settings'), { external: true, redirectCode: 302 })
}
</script>
