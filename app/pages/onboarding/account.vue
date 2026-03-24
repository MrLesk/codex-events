<script setup lang="ts">
const route = useRoute()

const redirectQuery = new URLSearchParams()

for (const [key, value] of Object.entries(route.query)) {
  if (typeof value === 'string') {
    redirectQuery.set(key, value)
  }
}

await navigateTo(`/auth/access${redirectQuery.size > 0 ? `?${redirectQuery.toString()}` : ''}`, {
  replace: true
})
</script>
