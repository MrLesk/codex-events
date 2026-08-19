import { describe, expect, test } from 'vitest'

import {
  accountEventPageNames as clientPageNames,
  accountEventPagePaths as clientPagePaths
} from '../../../../../app/domains/events/account-workspace-page'
import {
  accountEventPageNames as serverPageNames,
  accountEventPageRoutePaths as serverPagePaths
} from '../../../../../server/domains/events/account-event-page-contract'

describe('account-event page registry boundary', () => {
  test('keeps client and server page names and route paths exactly aligned', () => {
    expect(serverPageNames).toEqual(clientPageNames)
    expect(serverPagePaths).toEqual(clientPagePaths)
  })
})
