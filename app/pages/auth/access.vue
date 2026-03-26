<script setup lang="ts">
import { accountDashboardHref, buildAuthLoginHref } from '~/utils/auth-navigation'

if (useUser().value) {
  await navigateTo(accountDashboardHref, { redirectCode: 301 })
} else {
  await navigateTo(buildAuthLoginHref(accountDashboardHref), { external: true, redirectCode: 302 })
}
</script>
