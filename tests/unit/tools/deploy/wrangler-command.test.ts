import { describe, expect, test } from 'vitest'

import { buildWranglerEnvironment } from '../../../../tools/deploy/wrangler-command'

describe('Wrangler command environment', () => {
  test('maps project Cloudflare credentials to Wrangler-supported names', () => {
    expect(buildWranglerEnvironment({
      CF_ACCOUNT_ID: ' account-id ',
      CF_API_TOKEN: ' api-token '
    })).toMatchObject({
      CF_ACCOUNT_ID: ' account-id ',
      CF_API_TOKEN: ' api-token ',
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      CLOUDFLARE_API_TOKEN: 'api-token'
    })
  })

  test('prefers the management token when provided', () => {
    expect(buildWranglerEnvironment({
      CF_ACCOUNT_ID: 'account-id',
      CF_API_TOKEN: 'api-token',
      CF_MGMT_TOKEN: 'mgmt-token'
    })).toMatchObject({
      CLOUDFLARE_ACCOUNT_ID: 'account-id',
      CLOUDFLARE_API_TOKEN: 'mgmt-token'
    })
  })

  test('requires the project Cloudflare account ID', () => {
    expect(() => buildWranglerEnvironment({
      CF_API_TOKEN: 'api-token'
    })).toThrow('CF_ACCOUNT_ID is required to run Wrangler.')
  })

  test('requires the project Cloudflare API token', () => {
    expect(() => buildWranglerEnvironment({
      CF_ACCOUNT_ID: 'account-id'
    })).toThrow('CF_API_TOKEN is required to run Wrangler.')
  })
})
