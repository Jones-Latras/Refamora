export function serializeCrashError(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message.trim() || 'Unknown error',
      stack: typeof error.stack === 'string' && error.stack.trim() ? error.stack : null,
    }
  }

  if (typeof error === 'string') {
    return {
      message: error.trim() || 'Unknown error',
      stack: null,
    }
  }

  return {
    message: 'Unknown error',
    stack: null,
  }
}

export function createCrashFingerprint(input: {
  source: string
  message: string
  route?: string | null
  stack?: string | null
}) {
  return [input.source, input.message.trim(), input.route?.trim() ?? '', input.stack?.trim() ?? '']
    .join('::')
    .toLowerCase()
}
