export function formatPrice(value: number, unit = 'kg') {
  return `PHP ${value.toFixed(2)}/${unit}`
}

export function formatDate(value?: string | null) {
  if (!value) {
    return 'Just now'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatDateTime(value?: string | null) {
  if (!value) {
    return 'Just now'
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export function formatRelativeTime(value?: string | null) {
  if (!value) {
    return 'now'
  }

  const timestamp = new Date(value).getTime()

  if (Number.isNaN(timestamp)) {
    return 'now'
  }

  const diffMs = Math.max(Date.now() - timestamp, 0)
  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMinutes < 1) {
    return 'now'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes}m`
  }

  if (diffHours < 24) {
    return `${diffHours}h`
  }

  if (diffDays < 7) {
    return `${diffDays}d`
  }

  return new Intl.DateTimeFormat('en-PH', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value))
}

export function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
