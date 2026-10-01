import { useEffect, useState, type ReactNode } from 'react'
import { ApiError, request, resetCsrf, saveJson } from '../../shared/api/http'
import { AuthContext as Context, type Session } from './model/authContext'
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('')
  async function refresh() {
    try {
      setSession(await request<Session>('/api/v1/auth/session'))
      setError('')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        resetCsrf()
        setSession({ setupRequired: false, user: null })
        setError('')
      } else setError('No pudimos comprobar el acceso. Reintenta la conexión.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), 0)
    const expired = () => {
      resetCsrf()
      setSession({ setupRequired: false, user: null })
    }
    window.addEventListener('session-expired', expired)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('session-expired', expired)
    }
  }, [])
  async function login(username: string, password: string) {
    const result = await request<Session>('/api/v1/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password }).toString(),
    })
    resetCsrf()
    setSession(result)
  }
  async function setup(body: unknown) {
    await saveJson('/api/v1/auth/setup', body)
    await refresh()
  }
  async function logout() {
    await request('/api/v1/auth/logout', { method: 'POST' })
    resetCsrf()
    window.history.replaceState(null, '', '/')
    setSession({ setupRequired: false, user: null })
  }
  return (
    <Context.Provider
      value={{
        session,
        loading,
        error,
        refresh,
        login,
        setup,
        logout,
        can: (p) => session?.user?.permissions.includes(p) ?? false,
      }}
    >
      {children}
    </Context.Provider>
  )
}
