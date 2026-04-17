import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'

import type { UserRole } from '../types/app'

import {
  consumeSignedOutNoticeSuppression,
  getSession,
} from '../services/authService'
import { getUserRole } from '../services/profileService'
import { hasSupabaseEnv, supabase } from '../services/supabase'

type AuthNotice = {
  type: 'session_expired'
  message: string
}

type AuthContextValue = {
  user: User | null
  session: Session | null
  role: UserRole | null
  isLoading: boolean
  notice: AuthNotice | null
  clearNotice: () => void
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [notice, setNotice] = useState<AuthNotice | null>(null)
  const sessionRef = useRef<Session | null>(null)

  const loadRole = async (userId: string) => {
    const nextRole = await getUserRole(userId)
    setRole(nextRole)
  }

  useEffect(() => {
    let isMounted = true

    const bootstrap = async () => {
      if (!hasSupabaseEnv || !supabase) {
        if (isMounted) {
          setIsLoading(false)
        }
        return
      }

      const currentSession = await getSession()

      if (!isMounted) {
        return
      }

      setIsLoading(true)
      setSession(currentSession)
      sessionRef.current = currentSession
      setUser(currentSession?.user ?? null)

      if (currentSession?.user) {
        await loadRole(currentSession.user.id)
      } else {
        setRole(null)
      }

      if (isMounted) {
        setIsLoading(false)
      }
    }

    void bootstrap()

    if (!supabase) {
      return () => {
        isMounted = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) {
        return
      }

      const wasAuthenticated = Boolean(sessionRef.current?.user)
      const isIntentionalSignOut =
        event === 'SIGNED_OUT' ? consumeSignedOutNoticeSuppression() : false

      setIsLoading(true)
      setSession(nextSession)
      sessionRef.current = nextSession
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        await loadRole(nextSession.user.id)
      } else {
        setRole(null)
      }

      if (
        event === 'SIGNED_OUT' &&
        wasAuthenticated &&
        !nextSession &&
        !isIntentionalSignOut
      ) {
        setNotice({
          type: 'session_expired',
          message: 'Your session expired. Please sign in again to continue.',
        })
      }

      if (isMounted) {
        setIsLoading(false)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        role,
        isLoading,
        notice,
        clearNotice: () => setNotice(null),
        refreshRole: async () => {
          if (user) {
            await loadRole(user.id)
          }
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider.')
  }

  return context
}
