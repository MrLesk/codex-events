export const appShellSidebarCollapsedStateKey = 'app-shell-sidebar-collapsed'
export const appShellSidebarCollapseStorageKey = 'codex-hackathons-sidebar-collapsed'

export function getAppShellSidebarRailClass(collapsed: boolean) {
  return collapsed ? 'w-[68px] min-w-[68px]' : 'w-[260px] min-w-[260px]'
}

export function getAppShellSidebarPanelClass(collapsed: boolean) {
  return collapsed ? 'w-[68px]' : 'w-[260px]'
}

export function getAppShellFooterOffsetClass(collapsed: boolean) {
  return collapsed ? 'lg:pl-[68px]' : 'lg:pl-[260px]'
}
