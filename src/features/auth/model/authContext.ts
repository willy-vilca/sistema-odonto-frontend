import { createContext } from 'react'
export interface CurrentUser {
  id: string
  username: string
  displayName: string
  roles: string[]
  permissions: string[]
}
export interface Session {
  setupRequired: boolean
  user: CurrentUser | null
}
export interface AuthState {
  session: Session | null
  loading: boolean
  error: string
  refresh: () => Promise<void>
  login: (username: string, password: string) => Promise<void>
  setup: (body: unknown) => Promise<void>
  logout: () => Promise<void>
  can: (permission: string) => boolean
}
export const AuthContext = createContext<AuthState | null>(null)
