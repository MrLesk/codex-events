<script setup lang="ts">
const route = useRoute()

await navigateTo({
  path: '/account/judging',
  query: route.query
}, { redirectCode: 301 })
</script>
