import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, session } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [role, setRole] = useState(session.role)     // 'student' | 'staff' | null
  const [user, setUser] = useState(session.user)

  // On load, re-validate the stored token against the API.
  useEffect(() => {
    if (!session.token) return
    const check = session.role === 'staff' ? api.meStaff : api.meStudent
    check()
      .then((u) => { setUser(u); session.saveUser(u) })
      .catch(() => { session.clear(); setRole(null); setUser(null) })
  }, [])

  const login = useCallback((tokenOut) => {
    session.save(tokenOut)
    setRole(tokenOut.role)
    setUser(tokenOut.user)
  }, [])

  const logout = useCallback(() => {
    session.clear()
    setRole(null)
    setUser(null)
  }, [])

  const refreshUser = useCallback(async () => {
    if (!session.token) return
    const u = await (session.role === 'staff' ? api.meStaff() : api.meStudent())
    setUser(u)
    session.saveUser(u)
    return u
  }, [])

  const value = useMemo(
    () => ({
      role,
      user,
      isStudent: role === 'student',
      isStaff: role === 'staff',
      login,
      logout,
      refreshUser,
    }),
    [role, user, login, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
