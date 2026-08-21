const timestampFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
})

const localTimeFormatter = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
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

export function formatLocalTime(value: string | null | undefined, fallback: string = '') {
  if (!value) {
    return fallback
  }

  const parsedValue = new Date(value)

  if (Number.isNaN(parsedValue.getTime())) {
    return fallback
  }

  return localTimeFormatter.format(parsedValue)
}
