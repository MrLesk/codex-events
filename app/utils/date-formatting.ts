const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
})

export function formatTimestamp(value: string | null | undefined, fallback: string = 'Not recorded') {
  if (!value) {
    return fallback
  }

  const parsedValue = new Date(value)

  if (Number.isNaN(parsedValue.getTime())) {
    return fallback
  }

  return timestampFormatter.format(parsedValue)
}
