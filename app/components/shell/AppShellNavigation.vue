<script setup lang="ts">
import type { ShellNavigationGroup } from '~/composables/useShellNavigation'

const props = defineProps<{
  groups: ShellNavigationGroup[]
}>()

const route = useRoute()

function isActiveLink(to: string) {
  if (to === '/') {
    return route.path === '/'
  }

  return route.path === to || route.path.startsWith(`${to}/`)
}
</script>

<template>
  <div class="space-y-6">
    <section
      v-for="group in props.groups"
      :key="group.label"
      class="rounded-[1.75rem] border border-default/70 bg-elevated/80 p-3 shadow-[0_24px_60px_-46px_rgba(15,20,34,0.55)] backdrop-blur"
    >
      <div class="px-2 pb-2 pt-1">
        <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted">
          {{ group.label }}
        </p>
      </div>

      <div class="space-y-2">
        <NuxtLink
          v-for="item in group.items"
          :key="item.id"
          :to="item.to"
          class="group flex items-start gap-3 rounded-[1.25rem] px-3 py-3 transition-colors"
          :class="isActiveLink(item.to)
            ? 'bg-primary/10 text-highlighted'
            : 'hover:bg-accented/70 text-toned'"
        >
          <div
            class="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full border border-default/70 bg-bg/80 text-primary"
            :class="isActiveLink(item.to) ? 'border-primary/40 bg-primary/10 text-primary' : undefined"
          >
            <AppIcon
              :name="item.icon"
              class="size-4"
            />
          </div>

          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-2">
              <p class="text-sm font-semibold text-highlighted">
                {{ item.label }}
              </p>
              <AppBadge
                v-if="item.badge"
                color="neutral"
                variant="soft"
                size="sm"
                class="rounded-full"
              >
                {{ item.badge }}
              </AppBadge>
            </div>
            <p class="mt-1 text-xs leading-6 text-muted">
              {{ item.description }}
            </p>
          </div>
        </NuxtLink>
      </div>
    </section>
  </div>
</template>
