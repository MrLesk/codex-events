<template>
  <footer class="border-t border-black/8 bg-white dark:border-white/[0.08] dark:bg-black">
    <AppContainer class="flex items-center justify-end gap-5 py-6 text-sm text-neutral-700 dark:text-[#A3A3A3]">
      <NuxtLink
        to="/terms-and-conditions"
        class="transition-colors hover:text-highlighted dark:hover:text-white"
      >
        Terms and Conditions
      </NuxtLink>
      <NuxtLink
        to="/privacy-policy"
        class="transition-colors hover:text-highlighted dark:hover:text-white"
      >
        Privacy Policy
      </NuxtLink>
    </AppContainer>
  </footer>
</template>
