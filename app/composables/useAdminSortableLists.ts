import type Sortable from 'sortablejs'
import type { MaybeRefOrGetter, WatchSource } from 'vue'
import {
  nextTick,
  onBeforeUnmount,
  toValue,
  watch
} from 'vue'

type SortableConstructor = typeof Sortable
type SortableInstance = Sortable

interface UseAdminSortableListsOptions {
  elements: MaybeRefOrGetter<ReadonlyArray<HTMLElement | null>>
  enabled: MaybeRefOrGetter<boolean>
  sources: WatchSource[]
  createOptions: (element: HTMLElement) => Sortable.Options
  onDestroy?: () => void
}

export function useAdminSortableLists(options: UseAdminSortableListsOptions) {
  let sortableInstances: SortableInstance[] = []
  let sortableConstructor: SortableConstructor | null = null

  function destroySortables() {
    sortableInstances.forEach(sortable => sortable.destroy())
    sortableInstances = []
    options.onDestroy?.()
  }

  async function loadSortableConstructor() {
    if (!sortableConstructor) {
      const module = await import('sortablejs')
      sortableConstructor = module.default
    }

    return sortableConstructor
  }

  async function initializeSortables() {
    const elements = toValue(options.elements).filter((element): element is HTMLElement => Boolean(element))

    if (!import.meta.client || !toValue(options.enabled) || elements.length === 0) {
      destroySortables()
      return
    }

    const Sortable = await loadSortableConstructor()
    const currentElements = toValue(options.elements).filter((element): element is HTMLElement => Boolean(element))

    if (!toValue(options.enabled) || currentElements.length === 0) {
      destroySortables()
      return
    }

    destroySortables()
    sortableInstances = currentElements.map(element => Sortable.create(element, options.createOptions(element)))
  }

  watch(options.sources, async () => {
    await nextTick()
    await initializeSortables()
  }, {
    immediate: true,
    flush: 'post'
  })

  onBeforeUnmount(() => {
    destroySortables()
  })

  return {
    destroySortables,
    initializeSortables
  }
}
