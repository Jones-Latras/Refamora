import { useEffect, useState } from 'react'

export function useAsync<T>(
  asyncFn: () => Promise<T>,
  deps: unknown[] = [],
  enabled = true,
) {
  const [data, setData] = useState<T | null>(null)
  const [isLoading, setIsLoading] = useState(enabled)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    let isMounted = true

    const run = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const result = await asyncFn()
        if (isMounted) {
          setData(result)
        }
      } catch (nextError) {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError
              : new Error('Unknown error'),
          )
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void run()

    return () => {
      isMounted = false
    }
  }, [enabled, ...deps])

  const refetch = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await asyncFn()
      setData(result)
      return result
    } catch (nextError) {
      const resolvedError =
        nextError instanceof Error ? nextError : new Error('Unknown error')
      setError(resolvedError)
      throw resolvedError
    } finally {
      setIsLoading(false)
    }
  }

  return { data, isLoading, error, refetch }
}
