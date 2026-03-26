<script setup lang="ts">
definePageMeta({
  layout: 'profile'
})

await navigateTo('/account/dashboard', { redirectCode: 301 })
</script>
