import type { RouteApplicationOperation } from './types'
import { registerApplicationOperation } from './registry'
import { applicationOperationLoaders } from './generated-catalog'

interface OperationRouteModule {
  applicationOperation?: RouteApplicationOperation
}

let catalogPromise: Promise<void> | undefined

export function loadApplicationOperationCatalog() {
  catalogPromise ??= (async () => {
    await import('#server/domains/events')
    for (const load of applicationOperationLoaders) {
      const module = await load() as OperationRouteModule
      if (module.applicationOperation) {
        registerApplicationOperation(module.applicationOperation)
      }
    }
  })()
  return catalogPromise
}
