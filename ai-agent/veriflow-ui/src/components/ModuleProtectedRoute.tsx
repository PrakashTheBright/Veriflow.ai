import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import toast from 'react-hot-toast'
import { useEffect, useRef } from 'react'

interface ModuleProtectedRouteProps {
  children: React.ReactNode
  moduleName: string
}

/**
 * Protects routes based on user's assigned modules
 * Admin users have access to all modules
 * Regular users must have the module assigned to access
 */
export default function ModuleProtectedRoute({ children, moduleName }: ModuleProtectedRouteProps) {
  const { user } = useAuthStore()
  const toastShownRef = useRef(false)

  // Check if user is admin
  const isAdmin = user?.role === 'admin' || user?.email === 'admin@veriflow.ai' || user?.username === 'admin'

  // Check if user has access to this module
  const hasAccess = isAdmin || user?.modules?.some(m => m.name === moduleName)

  useEffect(() => {
    if (!hasAccess && !toastShownRef.current) {
      toastShownRef.current = true
      toast.error(`You don't have access to the ${moduleName} module`)
    }
  }, [hasAccess, moduleName])

  if (!hasAccess) {
    return <Navigate to="/app" replace />
  }

  return <>{children}</>
}
