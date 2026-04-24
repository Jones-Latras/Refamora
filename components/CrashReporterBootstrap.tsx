import { useEffect, useRef } from 'react'
import { usePathname } from 'expo-router'

import type { UserRole } from '../types/app'
import { useAuth } from '../hooks/useAuth'
import { reportAppCrash } from '../services/crashReportingService'

type GlobalErrorHandler = (error: Error, isFatal?: boolean) => void
type GlobalErrorUtils = {
  getGlobalHandler?: () => GlobalErrorHandler | undefined
  setGlobalHandler?: (handler: GlobalErrorHandler) => void
}

export function CrashReporterBootstrap() {
  const pathname = usePathname()
  const { user, role } = useAuth()
  const routeRef = useRef(pathname)
  const userIdRef = useRef<string | null>(user?.id ?? null)
  const roleRef = useRef<UserRole | null>(role)

  useEffect(() => {
    routeRef.current = pathname
  }, [pathname])

  useEffect(() => {
    userIdRef.current = user?.id ?? null
  }, [user])

  useEffect(() => {
    roleRef.current = role
  }, [role])

  useEffect(() => {
    const errorUtils = (global as typeof globalThis & { ErrorUtils?: GlobalErrorUtils })
      .ErrorUtils

    if (!errorUtils?.setGlobalHandler) {
      return
    }

    const previousHandler = errorUtils.getGlobalHandler?.()

    const nextHandler: GlobalErrorHandler = (error, isFatal) => {
      void reportAppCrash({
        source: 'global_js_handler',
        severity: isFatal ? 'fatal' : 'error',
        error,
        route: routeRef.current,
        userId: userIdRef.current,
        userRole: roleRef.current,
        metadata: {
          isFatal: Boolean(isFatal),
        },
      })

      previousHandler?.(error, isFatal)
    }

    errorUtils.setGlobalHandler(nextHandler)

    return () => {
      if (previousHandler) {
        errorUtils.setGlobalHandler?.(previousHandler)
      }
    }
  }, [])

  return null
}
