<script setup lang="ts">
import { LogOutIcon, SettingsIcon } from 'lucide-vue-next'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '~/components/ui/dropdown-menu'
import { authLogoutHref } from '~/utils/auth-navigation'

const props = defineProps<{
  name?: string | null
  email?: string | null
  avatarSrc?: string
  avatarAlt?: string | null
}>()

const displayName = computed(() => props.name?.trim() || 'Developer User')
const displayEmail = computed(() => props.email?.trim() || 'Signed in')
const avatarAlt = computed(() => props.avatarAlt?.trim() || displayName.value)

async function navigateToSettings() {
  await navigateTo('/account/settings')
}

async function logout() {
  await navigateTo(authLogoutHref, { external: true })
}
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <button
        type="button"
        class="ml-2 rounded-full transition-opacity hover:opacity-90"
        aria-label="Open profile menu"
      >
        <AppAvatar
          :src="props.avatarSrc"
          :alt="avatarAlt"
          fallback="icon"
        />
      </button>
    </DropdownMenuTrigger>

    <DropdownMenuContent
      align="end"
      :side-offset="8"
      class="w-48 overflow-hidden rounded-xl border border-white/[0.08] bg-[#111111] p-0 text-white shadow-[0_24px_60px_-24px_rgba(0,0,0,0.72)]"
    >
      <div class="border-b border-white/[0.08] px-4 py-3">
        <p class="text-[13px] font-medium text-white">
          {{ displayName }}
        </p>
        <p class="truncate text-[12px] text-[#8C8C8C]">
          {{ displayEmail }}
        </p>
      </div>

      <div class="py-1">
        <DropdownMenuItem
          class="gap-2 rounded-none px-4 py-2 text-[13px] text-[#A3A3A3] focus:bg-white/[0.04] focus:text-white data-[highlighted]:bg-white/[0.04] data-[highlighted]:text-white [&_svg]:text-current"
          @select.prevent="navigateToSettings"
        >
          <SettingsIcon class="size-4" />
          <span>Settings</span>
        </DropdownMenuItem>

        <DropdownMenuItem
          variant="destructive"
          class="gap-2 rounded-none px-4 py-2 text-[13px] text-red-400 focus:bg-red-400/10 focus:text-red-400 data-[highlighted]:bg-red-400/10 data-[highlighted]:text-red-400 [&_svg]:text-current"
          @select.prevent="logout"
        >
          <LogOutIcon class="size-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
