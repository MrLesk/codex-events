<script setup lang="ts">
defineProps<{
  hackathonSlug: string
  currentSurface: 'settings' | 'operations' | 'judging'
}>()
</script>

<template>
  <nav
    aria-label="Admin workspace sections"
    class="flex items-center gap-5 overflow-x-auto"
  >
    <NuxtLink
      :to="`/account/hackathons/${hackathonSlug}/admin`"
      class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
      :class="currentSurface === 'settings' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
    >
      Settings
    </NuxtLink>
    <NuxtLink
      :to="`/account/hackathons/${hackathonSlug}/admin/operations`"
      class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
      :class="currentSurface === 'operations' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
    >
      Operations
    </NuxtLink>
    <NuxtLink
      :to="`/account/hackathons/${hackathonSlug}/admin/competition`"
      class="border-b-2 pb-3 text-[14px] font-medium transition-colors"
      :class="currentSurface === 'judging' ? 'border-black text-highlighted dark:border-white dark:text-white' : 'border-transparent text-neutral-500 hover:text-highlighted dark:text-[#A3A3A3] dark:hover:text-white'"
    >
      Judging
    </NuxtLink>
  </nav>
</template>
