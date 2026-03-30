import { describe, expect, test } from 'vitest'

import {
  getAppShellFooterOffsetClass,
  getAppShellSidebarPanelClass,
  getAppShellSidebarRailClass
} from '../../../../app/utils/shell-sidebar'

describe('shell sidebar helpers', () => {
  test('returns the correct rail and panel widths for collapsed and expanded states', () => {
    expect(getAppShellSidebarRailClass(true)).toBe('w-[68px] min-w-[68px]')
    expect(getAppShellSidebarRailClass(false)).toBe('w-[260px] min-w-[260px]')
    expect(getAppShellSidebarPanelClass(true)).toBe('w-[68px]')
    expect(getAppShellSidebarPanelClass(false)).toBe('w-[260px]')
  })

  test('returns matching footer offsets for the live sidebar width', () => {
    expect(getAppShellFooterOffsetClass(true)).toBe('lg:pl-[68px]')
    expect(getAppShellFooterOffsetClass(false)).toBe('lg:pl-[260px]')
  })
})
