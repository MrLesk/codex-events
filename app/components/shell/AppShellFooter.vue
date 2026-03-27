<template>
  <footer class="relative z-20 border-t border-black/10 bg-white/90 backdrop-blur-md dark:border-white/[0.08] dark:bg-black/86">
    <AppContainer class="flex items-center justify-end gap-5 py-6 text-sm text-neutral-900 dark:text-[#E5E5E5]">
      <NuxtLink
        to="/terms-and-conditions"
        class="font-medium transition-colors hover:text-highlighted dark:text-[#E1E1E1] dark:hover:text-white"
      >
        Terms and Conditions
      </NuxtLink>
      <NuxtLink
        to="/privacy-policy"
        class="font-medium transition-colors hover:text-highlighted dark:text-[#E1E1E1] dark:hover:text-white"
      >
        Privacy Policy
      </NuxtLink>
    </AppContainer>
  </footer>
</template>
