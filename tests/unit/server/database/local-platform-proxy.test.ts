import { afterEach, describe, expect, test } from 'vitest'

import { createLocalPlatformProxy } from '../../../../server/database/local-platform-proxy'

describe('local Cloudflare platform proxy', () => {
  const proxies: Array<Awaited<ReturnType<typeof createLocalPlatformProxy>>> = []

  afterEach(async () => {
    while (proxies.length > 0) {
      await proxies.pop()?.dispose()
    }
  })

  test('provides a local D1 binding from wrangler configuration', async () => {
    const proxy = await createLocalPlatformProxy({
      persist: false
    })
    proxies.push(proxy)

    await proxy.env.DB.prepare('drop table if exists local_platform_proxy_test').run()
    await proxy.env.DB.prepare('create table local_platform_proxy_test (id text primary key, label text not null)').run()
    await proxy.env.DB.prepare("insert into local_platform_proxy_test (id, label) values ('row_1', 'fixture')").run()

    const label = await proxy.env.DB.prepare('select label from local_platform_proxy_test where id = ?')
      .bind('row_1')
      .first('label')

    expect(label).toBe('fixture')
  })
})
