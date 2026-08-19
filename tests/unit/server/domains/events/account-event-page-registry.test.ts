import { describe, expect, test } from 'vitest'

import {
  accountEventPageNames as clientPageNames,
  accountEventPagePaths as clientPagePaths
} from '../../../../../app/domains/events/account-workspace-page'
import {
  accountEventPageNames as serverPageNames,
  accountEventPageRoutePaths as serverPagePaths,
  accountJudgeAssignmentWorkspaceRoutePath as serverAssignmentPath
} from '../../../../../server/domains/events/account-event-page-contract'
import {
  accountEventPageNames as sharedPageNames,
  accountEventPagePaths as sharedPagePaths,
  accountJudgeAssignmentWorkspaceRoutePath as sharedAssignmentPath
} from '../../../../../shared/domains/events/account-event-page-registry'

describe('account-event page registry boundary', () => {
  test('keeps client and server page names and route paths exactly aligned', () => {
    expect(serverPageNames).toEqual(clientPageNames)
    expect(serverPagePaths).toEqual(clientPagePaths)
    expect(clientPageNames).toBe(sharedPageNames)
    expect(clientPagePaths).toBe(sharedPagePaths)
    expect(serverPageNames).toBe(sharedPageNames)
    expect(serverPagePaths).toBe(sharedPagePaths)
    expect(serverAssignmentPath).toBe(sharedAssignmentPath)
  })
})
