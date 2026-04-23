type ExpoHostCandidate = string | null | undefined

const LOCAL_SUPABASE_PORT = '54321'

export function getExpoDevHost(candidates: ExpoHostCandidate[]) {
  for (const candidate of candidates) {
    if (typeof candidate !== 'string') {
      continue
    }

    const [host] = candidate.trim().split(':')

    if (host) {
      return host
    }
  }

  return ''
}

export function isLoopbackHost(hostname: string) {
  return (
    hostname === '127.0.0.1' ||
    hostname === 'localhost' ||
    hostname === '0.0.0.0' ||
    hostname === '::1'
  )
}

export function isPrivateIpv4Host(hostname: string) {
  const octets = hostname.split('.').map((segment) => Number.parseInt(segment, 10))

  if (
    octets.length !== 4 ||
    octets.some((octet) => Number.isNaN(octet) || octet < 0 || octet > 255)
  ) {
    return false
  }

  const [first, second] = octets

  return (
    first === 10 ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168)
  )
}

export function resolveSupabaseUrl(rawUrl: string, expoDevHost: string, isDev: boolean) {
  const trimmedUrl = rawUrl.trim()

  if (!trimmedUrl || !isDev) {
    return trimmedUrl
  }

  if (!expoDevHost) {
    return trimmedUrl
  }

  try {
    const url = new URL(trimmedUrl)
    const isLocalSupabaseHost =
      isLoopbackHost(url.hostname) || isPrivateIpv4Host(url.hostname)

    if (
      url.protocol !== 'http:' ||
      url.port !== LOCAL_SUPABASE_PORT ||
      !isLocalSupabaseHost ||
      url.hostname === expoDevHost
    ) {
      return trimmedUrl
    }

    url.hostname = expoDevHost
    return url.toString().replace(/\/$/, '')
  } catch {
    return trimmedUrl
  }
}
