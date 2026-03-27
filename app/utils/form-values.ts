import { isProxy, toRaw } from 'vue'

function toPlainFormValue(value: unknown, seen: WeakMap<object, unknown>): unknown {
  if (value === null || value === undefined || typeof value !== 'object') {
    return value
  }

  const rawValue = isProxy(value) ? toRaw(value) : value

  if (Array.isArray(rawValue)) {
    if (seen.has(rawValue)) {
      return seen.get(rawValue)
    }

    const clone: unknown[] = []
    seen.set(rawValue, clone)

    for (const item of rawValue) {
      clone.push(toPlainFormValue(item, seen))
    }

    return clone
  }

  const prototype = Object.getPrototypeOf(rawValue)

  if (prototype !== Object.prototype && prototype !== null) {
    return rawValue
  }

  if (seen.has(rawValue)) {
    return seen.get(rawValue)
  }

  const clone: Record<string, unknown> = {}
  seen.set(rawValue, clone)

  for (const [key, entry] of Object.entries(rawValue)) {
    clone[key] = toPlainFormValue(entry, seen)
  }

  return clone
}

export function cloneFormValues<T>(value: T): T {
  const normalizedValue = toPlainFormValue(value, new WeakMap())
  return globalThis.structuredClone(normalizedValue) as T
}
