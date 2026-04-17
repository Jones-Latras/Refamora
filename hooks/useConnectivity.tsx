import NetInfo from '@react-native-community/netinfo'
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

type ConnectivityContextValue = {
  isOffline: boolean
  isChecking: boolean
  refreshConnectivity: () => Promise<void>
}

const ConnectivityContext = createContext<ConnectivityContextValue | null>(null)

function resolveOfflineState(
  isConnected: boolean | null,
  isInternetReachable: boolean | null,
) {
  if (isConnected === false || isInternetReachable === false) {
    return true
  }

  return false
}

export function ConnectivityProvider({ children }: { children: ReactNode }) {
  const [isOffline, setIsOffline] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let isMounted = true

    const unsubscribe = NetInfo.addEventListener((state) => {
      if (!isMounted) {
        return
      }

      setIsOffline(
        resolveOfflineState(state.isConnected, state.isInternetReachable),
      )
      setIsChecking(false)
    })

    void NetInfo.fetch().then((state) => {
      if (!isMounted) {
        return
      }

      setIsOffline(
        resolveOfflineState(state.isConnected, state.isInternetReachable),
      )
      setIsChecking(false)
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  const value = useMemo(
    () => ({
      isOffline,
      isChecking,
      refreshConnectivity: async () => {
        const state = await NetInfo.fetch()
        setIsOffline(
          resolveOfflineState(state.isConnected, state.isInternetReachable),
        )
        setIsChecking(false)
      },
    }),
    [isChecking, isOffline],
  )

  return (
    <ConnectivityContext.Provider value={value}>
      {children}
    </ConnectivityContext.Provider>
  )
}

export function useConnectivity() {
  const context = useContext(ConnectivityContext)

  if (!context) {
    throw new Error('useConnectivity must be used inside ConnectivityProvider.')
  }

  return context
}
