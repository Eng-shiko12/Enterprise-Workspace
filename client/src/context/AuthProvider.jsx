import { useCallback, useEffect, useMemo, useState } from 'react'
import { AuthContext } from './contexts'
import { getMyProfile, loginUser, logoutUser } from '../api/authApi'
import { socket } from '../lib/socket'

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Restore the session from the httpOnly cookie
  useEffect(() => {
    let alive = true
    getMyProfile()
      .then((d) => alive && setUser(d.user))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false))
    return () => {
      alive = false
    }
  }, [])

  // Session expired somewhere in the app
  useEffect(() => {
    const onExpired = () => setUser(null)
    window.addEventListener('vortex:unauthorized', onExpired)
    return () => window.removeEventListener('vortex:unauthorized', onExpired)
  }, [])

  // One realtime connection per signed-in user
  useEffect(() => {
    if (!user) return undefined
    socket.connect()
    return () => {
      socket.disconnect()
    }
  }, [user?._id]) // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (credentials) => {
    const data = await loginUser(credentials)
    setUser(data.user)
    return data.user
  }, [])

  const logout = useCallback(async () => {
    try {
      await logoutUser()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(() => ({ user, setUser, loading, login, logout }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
