import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { api } from '../services/api'

interface UserModule {
  id: number
  name: string
  path: string
  icon?: string
  display_order?: number
}

interface User {
  id: string
  username: string
  email: string
  role?: string
  createdAt: string
  modules?: UserModule[]
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
  login: (email: string, password: string) => Promise<boolean>
  signup: (username: string, email: string, password: string) => Promise<boolean>
  logout: () => void
  clearError: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.login(email, password)

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          })
          return false
        }
      },

      signup: async (username: string, email: string, password: string) => {
        set({ isLoading: true, error: null })
        try {
          const data = await api.signup(username, email, password)

          set({
            user: data.user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
          })
          return true
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Signup failed',
            isLoading: false,
          })
          return false
        }
      },

      logout: () => {
        api.logout().catch(() => {})
        api.setToken(null)
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        })
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'veriflow-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
