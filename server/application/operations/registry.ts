import type { ApplicationOperation, OperationCapability } from './types'

const registry = new Map<string, ApplicationOperation>()
const restBindings = new Map<string, string>()

function restBindingKey(operation: ApplicationOperation) {
  return `${operation.rest.method} ${operation.rest.path}`
}

export function registerApplicationOperation(operation: ApplicationOperation) {
  if (registry.has(operation.id)) {
    throw new Error(`Duplicate application operation ID: ${operation.id}`)
  }

  const binding = restBindingKey(operation)
  if (restBindings.has(binding)) {
    throw new Error(`Duplicate application operation REST binding: ${binding}`)
  }

  registry.set(operation.id, operation)
  restBindings.set(binding, operation.id)
  return operation
}

export function listApplicationOperations() {
  return [...registry.values()]
}

export function getApplicationOperation(id: string) {
  return registry.get(id)
}

export function listApplicationOperationsForCapabilities(capabilities: ReadonlySet<OperationCapability>) {
  return listApplicationOperations().filter(operation =>
    operation.capabilities.some(capability => capabilities.has(capability))
  )
}
