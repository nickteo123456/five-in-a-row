'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  email: string
  name: string
  role: string
}

interface AuthContextType {
  user: User | null
  login: (email: string, password: string, redirectTo?: string) => Promise<void>
  register: (email: string, password: string, name: string, redirectTo?: string) => Promise<void>
  loginAsGuest: (redirectTo?: string) => Promise<void>
  logout: () => Promise<void>
  loading: boolean
  isGuest: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

const GUEST_LIFETIME_MS = 24 * 60 * 60 * 1000

function clearGuest() {
  localStorage.removeItem('user')
  localStorage.removeItem('isGuest')
  localStorage.removeItem('sessionTimestamp')
}

function loadGuest(): User | null {
  const savedUser = localStorage.getItem('user')
  const savedIsGuest = localStorage.getItem('isGuest') === 'true'
  const sessionTimestamp = parseInt(localStorage.getItem('sessionTimestamp') || '0')

  if (savedUser && savedIsGuest && Date.now() - sessionTimestamp < GUEST_LIFETIME_MS) {
    return JSON.parse(savedUser)
  }

  clearGuest()
  return null
}

// Only follow redirects within this site
function safeRedirect(redirectTo?: string) {
  return redirectTo && /^\/(?![/\\])/.test(redirectTo) ? redirectTo : '/'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isGuest, setIsGuest] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const loadSession = async () => {
      try {
        const response = await fetch('/api/auth/me')

        if (response.ok) {
          const data = await response.json()
          clearGuest()
          setUser(data.user)
          return
        }

        // No server session. A guest only exists in this browser and the
        // server never treats it as authenticated.
        const guestUser = loadGuest()
        setUser(guestUser)
        setIsGuest(guestUser !== null)
      } catch (error) {
        console.error('Error loading session:', error)
      } finally {
        setLoading(false)
      }
    }

    loadSession()
  }, [])

  const login = async (email: string, password: string, redirectTo?: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Login failed')
    }

    const data = await response.json()
    clearGuest()
    setUser(data.user)
    setIsGuest(false)

    router.push(safeRedirect(redirectTo))
  }

  const register = async (email: string, password: string, name: string, redirectTo?: string) => {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        name: name,
      }),
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Failed to create user profile')
    }

    const data = await response.json()
    clearGuest()
    setUser(data.user)
    setIsGuest(false)

    router.push(safeRedirect(redirectTo))
  }

  const loginAsGuest = async (redirectTo?: string) => {
    const guestUser: User = {
      id: `guest-${Date.now()}`,
      email: 'guest@local',
      name: 'Guest Player',
      role: 'student',
    }

    // Make sure an earlier login doesn't take over again on the next page load
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined)

    setUser(guestUser)
    setIsGuest(true)
    localStorage.setItem('user', JSON.stringify(guestUser))
    localStorage.setItem('isGuest', 'true')
    localStorage.setItem('sessionTimestamp', Date.now().toString())

    router.push(safeRedirect(redirectTo))
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch (error) {
      console.error('Error logging out:', error)
    }
    setUser(null)
    setIsGuest(false)
    clearGuest()
    router.push('/login')
  }

  return (
    <AuthContext.Provider value={{ user, login, register, loginAsGuest, logout, loading, isGuest }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
