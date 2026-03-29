export function moveListItemByIndex<T>(items: T[], oldIndex: number, newIndex: number) {
  if (
    oldIndex === newIndex
    || oldIndex < 0
    || newIndex < 0
    || oldIndex >= items.length
    || newIndex >= items.length
  ) {
    return items
  }

  const reordered = [...items]
  const [movedItem] = reordered.splice(oldIndex, 1)

  if (!movedItem) {
    return items
  }

  reordered.splice(newIndex, 0, movedItem)
  return reordered
}
