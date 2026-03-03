import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import pool from '../database/init'

const JWT_SECRET = process.env.JWT_SECRET || 'veriflow-ai-secret-key-change-in-production'

// Map API routes to required module names
const routeModuleMapping: Record<string, string> = {
  '/api/tests': 'UI Testing',
  '/api/reports': 'Reports',
  '/api/users': 'Users',
  '/api/testcases': 'Create Test Cases',
  '/api/testcase-history': 'Create Test Cases',
  '/api/environments': 'Environments',
}

interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
    role: string
    modules?: string[]
  }
}

/**
 * Middleware to check if user has access to the requested module/route
 * Admin users bypass all module checks
 */
export const checkModuleAccess = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Extract token from header
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]

    if (!token) {
      return next() // Let the route handler deal with auth
    }

    // Decode token to get user
    let decoded: any
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch {
      return next() // Invalid token, let auth middleware handle it
    }

    // Get user's role
    const userResult = await pool.query(
      'SELECT id, role FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (userResult.rows.length === 0) {
      return next()
    }

    const user = userResult.rows[0]

    // Admin users bypass module checks
    if (user.role === 'admin') {
      return next()
    }

    // Find which module is required for this route
    const requestPath = req.path
    let requiredModule: string | null = null

    for (const [route, moduleName] of Object.entries(routeModuleMapping)) {
      if (requestPath.startsWith(route.replace('/api', ''))) {
        requiredModule = moduleName
        break
      }
    }

    // If no module mapping exists, allow access
    if (!requiredModule) {
      return next()
    }

    // Check if user has access to the required module
    const moduleResult = await pool.query(
      `SELECT m.name FROM user_modules um 
       JOIN modules m ON um.module_id = m.id 
       WHERE um.user_id = $1 AND m.name = $2`,
      [user.id, requiredModule]
    )

    if (moduleResult.rows.length === 0) {
      return res.status(403).json({
        message: `Access denied. You don't have permission to access the ${requiredModule} module.`,
        requiredModule,
      })
    }

    next()
  } catch (error) {
    console.error('Module access check error:', error)
    next() // On error, let the request proceed (fail open for now)
  }
}

/**
 * Factory function to create middleware for specific module access
 */
export const requireModule = (moduleName: string) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers['authorization']
      const token = authHeader && authHeader.split(' ')[1]

      if (!token) {
        return res.status(401).json({ message: 'Access token required' })
      }

      const decoded = jwt.verify(token, JWT_SECRET) as { userId: string }

      // Get user with role
      const userResult = await pool.query(
        'SELECT id, role FROM users WHERE id = $1',
        [decoded.userId]
      )

      if (userResult.rows.length === 0) {
        return res.status(401).json({ message: 'User not found' })
      }

      const user = userResult.rows[0]

      // Admin users bypass module checks
      if (user.role === 'admin') {
        return next()
      }

      // Check if user has access to the specified module
      const moduleResult = await pool.query(
        `SELECT m.name FROM user_modules um 
         JOIN modules m ON um.module_id = m.id 
         WHERE um.user_id = $1 AND m.name = $2`,
        [user.id, moduleName]
      )

      if (moduleResult.rows.length === 0) {
        return res.status(403).json({
          message: `Access denied. You don't have permission to access the ${moduleName} module.`,
          requiredModule: moduleName,
        })
      }

      next()
    } catch (error) {
      console.error('Module access check error:', error)
      return res.status(403).json({ message: 'Access check failed' })
    }
  }
}

export default { checkModuleAccess, requireModule }
