import { useContext } from 'react'
import { AuthContext } from '../model/authContext'
export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('AuthProvider requerido')
  return value
}
