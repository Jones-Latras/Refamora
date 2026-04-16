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

export function titleCase(value: string) {
  return value
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
