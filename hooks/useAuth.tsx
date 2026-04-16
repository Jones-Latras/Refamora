import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import type { UserRole } from '../types/app'

import { getSession } from '../services/authService'
import { getUserRole } from '../services/profileService'
import { hasSupabaseEnv, supabase } from '../services/supabase'

type AuthContextValue = {
  user: User | null
  session: Session | null
  role: UserRole | null
  isLoading: boolean
  refreshRole: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [isLoading, setIsLoading] = useState(true)

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
    } = supabase.auth.onAuthStateChange(async (_, nextSession) => {
      if (!isMounted) {
        return
      }

      setIsLoading(true)
      setSession(nextSession)
      setUser(nextSession?.user ?? null)

      if (nextSession?.user) {
        await loadRole(nextSession.user.id)
      } else {
        setRole(null)
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
