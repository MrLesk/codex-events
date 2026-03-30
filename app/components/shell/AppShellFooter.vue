<template>
  <footer class="relative z-20 border-t border-black/10 bg-white/70 backdrop-blur-md dark:border-white/[0.08] dark:bg-black/70">
    <AppContainer class="flex flex-col items-center gap-3 py-6 text-center text-sm text-neutral-900 dark:text-[#E5E5E5] sm:flex-row sm:items-center sm:justify-between sm:text-left">
      <p class="text-xs text-neutral-600 dark:text-[#A3A3A3]">
        We use only strictly necessary cookies and local storage for authentication, security, and site preferences.
      </p>

      <div class="flex flex-wrap items-center justify-center gap-5">
        <NuxtLink
          to="/imprint"
          class="font-medium transition-colors hover:text-highlighted dark:text-[#E1E1E1] dark:hover:text-white"
        >
          Imprint
        </NuxtLink>
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
      </div>
    </AppContainer>
  </footer>
</template>
