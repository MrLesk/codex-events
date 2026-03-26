<script setup lang="ts">
const route = useRoute()
const returnTo = typeof route.query.returnTo === 'string'
  ? route.query.returnTo
  : '/account/dashboard'

await navigateTo(`/account/settings?returnTo=${encodeURIComponent(returnTo)}`, { redirectCode: 301 })
</script>
