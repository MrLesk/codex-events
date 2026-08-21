import nitroHandler from '../../.output/server/index.mjs'
import { WorkerEntrypoint } from 'cloudflare:workers'

import {
  buildPublicCacheRequest,
  isPublicCacheableRequest
} from '../../shared/http/public-cache-topology.ts'

/**
 * The only entrypoint with Workers Cache enabled. It runs the existing Nitro
 * application and is reachable only through the uncached gateway below.
 */
export class PublicCache extends WorkerEntrypoint {
  fetch(request) {
    return nitroHandler.fetch(request, this.env, this.ctx)
  }
}

/**
 * Every external request enters here. The default entrypoint is explicitly
 * uncached in Wrangler, so authorization and the public-route decision run on
 * every request before a cacheable inner call is possible.
 */
export default {
  ...nitroHandler,
  async fetch(request, env, ctx) {
    if (isPublicCacheableRequest(request)) {
      return ctx.exports.PublicCache.fetch(buildPublicCacheRequest(request))
    }

    return nitroHandler.fetch(request, env, ctx)
  }
}
