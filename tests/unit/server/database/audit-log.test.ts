import { describe, expect, test, vi } from 'vitest'

import { writeAuditLog } from '../../../../server/database/audit-log'

describe('writeAuditLog', () => {
  test('writes a stable audit payload through the shared insert surface', async () => {
    const values = vi.fn().mockResolvedValue(undefined)
    const insert = vi.fn(() => ({ values }))

    const record = await writeAuditLog({ insert } as never, {
      actorUserId: 'user_1',
      entityType: 'hackathon',
      entityId: 'hackathon_1',
      action: 'hackathon.updated',
      metadata: { field: 'name' }
    })

    expect(insert).toHaveBeenCalledTimes(1)
    expect(values).toHaveBeenCalledWith(expect.objectContaining({
      actorUserId: 'user_1',
      entityType: 'hackathon',
      entityId: 'hackathon_1',
      action: 'hackathon.updated',
      metadata: { field: 'name' }
    }))
    expect(record.id).toBeTruthy()
  })
})
