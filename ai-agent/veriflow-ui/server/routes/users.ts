import { Router, Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import pool from '../database/init'

const router = Router()

const JWT_SECRET = process.env.JWT_SECRET || 'veriflow-ai-secret-key-change-in-production'

// Extend Express Request type
interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
    role: string
    created_at: string
  }
}

// Middleware to verify JWT token
const authenticateToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Access token required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any
    
    // Get user from database
    const result = await pool.query(
      'SELECT id, username, email, role, created_at FROM users WHERE id = $1',
      [decoded.userId]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid token' })
    }

    req.user = result.rows[0]
    next()
  } catch (error) {
    return res.status(403).json({ message: 'Invalid or expired token' })
  }
}

// Middleware to check if user is admin
const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }
  next()
}

// Get all available modules (admin only)
router.get('/modules', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      'SELECT id, name, path, icon, description, display_order FROM modules WHERE is_active = true ORDER BY display_order'
    )
    res.json({ modules: result.rows })
  } catch (error) {
    console.error('Get modules error:', error)
    res.status(500).json({ message: 'Failed to fetch modules' })
  }
})

// Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'path', m.path))
           FROM user_modules um
           JOIN modules m ON um.module_id = m.id
           WHERE um.user_id = u.id), '[]'
        ) AS modules
       FROM users u
       ORDER BY u.created_at DESC`
    )

    res.json({ users: result.rows })
  } catch (error) {
    console.error('Get users error:', error)
    res.status(500).json({ message: 'Failed to fetch users' })
  }
})

// Get single user by ID (admin only)
router.get('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
        COALESCE(
          (SELECT json_agg(json_build_object('id', m.id, 'name', m.name, 'path', m.path))
           FROM user_modules um
           JOIN modules m ON um.module_id = m.id
           WHERE um.user_id = u.id), '[]'
        ) AS modules
       FROM users u
       WHERE u.id = $1`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.json({ user: result.rows[0] })
  } catch (error) {
    console.error('Get user error:', error)
    res.status(500).json({ message: 'Failed to fetch user' })
  }
})

// Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { username, email, password, role, moduleIds } = req.body

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'Username, email, and password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    // Validate role
    const validRoles = ['user', 'admin']
    const userRole = role && validRoles.includes(role) ? role : 'user'

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    )

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' })
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)

    // Create user
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role, created_at',
      [username, email, passwordHash, userRole]
    )

    const user = result.rows[0]

    // Assign modules to user
    if (moduleIds && Array.isArray(moduleIds) && moduleIds.length > 0) {
      for (const moduleId of moduleIds) {
        await pool.query(
          'INSERT INTO user_modules (user_id, module_id) VALUES ($1, $2) ON CONFLICT (user_id, module_id) DO NOTHING',
          [user.id, moduleId]
        )
      }
    } else if (userRole === 'admin') {
      // Admin users get all modules by default
      await pool.query(
        `INSERT INTO user_modules (user_id, module_id)
         SELECT $1, id FROM modules
         ON CONFLICT (user_id, module_id) DO NOTHING`,
        [user.id]
      )
    }

    // Get assigned modules
    const modulesResult = await pool.query(
      `SELECT m.id, m.name, m.path 
       FROM user_modules um 
       JOIN modules m ON um.module_id = m.id 
       WHERE um.user_id = $1`,
      [user.id]
    )

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        modules: modulesResult.rows
      },
    })
  } catch (error) {
    console.error('Create user error:', error)
    res.status(500).json({ message: 'Failed to create user' })
  }
})

// Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params
    const { username, email, password, role, moduleIds } = req.body

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    )

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Build update query dynamically
    const updates: string[] = []
    const values: any[] = []
    let paramCount = 1

    if (username) {
      // Check if username is taken by another user
      const usernameCheck = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [username, id]
      )
      if (usernameCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Username already taken' })
      }
      updates.push(`username = $${paramCount++}`)
      values.push(username)
    }

    if (email) {
      // Check if email is taken by another user
      const emailCheck = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [email, id]
      )
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ message: 'Email already taken' })
      }
      updates.push(`email = $${paramCount++}`)
      values.push(email)
    }

    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters' })
      }
      const passwordHash = await bcrypt.hash(password, 12)
      updates.push(`password_hash = $${paramCount++}`)
      values.push(passwordHash)
    }

    if (role) {
      const validRoles = ['user', 'admin']
      if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role' })
      }
      updates.push(`role = $${paramCount++}`)
      values.push(role)
    }

    // Update user fields if any
    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`)
      values.push(id)

      const query = `
        UPDATE users 
        SET ${updates.join(', ')}
        WHERE id = $${paramCount}
        RETURNING id, username, email, role, created_at, updated_at
      `

      await pool.query(query, values)
    }

    // Update module assignments if moduleIds is provided
    if (moduleIds !== undefined && Array.isArray(moduleIds)) {
      // Delete existing module assignments
      await pool.query('DELETE FROM user_modules WHERE user_id = $1', [id])
      
      // Insert new module assignments
      for (const moduleId of moduleIds) {
        await pool.query(
          'INSERT INTO user_modules (user_id, module_id) VALUES ($1, $2) ON CONFLICT (user_id, module_id) DO NOTHING',
          [id, moduleId]
        )
      }
    }

    // Fetch updated user with modules
    const userResult = await pool.query(
      `SELECT 
        u.id, u.username, u.email, u.role, u.created_at, u.updated_at,
        COALESCE(
          json_agg(
            json_build_object('id', m.id, 'name', m.name, 'path', m.path)
          ) FILTER (WHERE m.id IS NOT NULL), 
          '[]'
        ) as modules
       FROM users u
       LEFT JOIN user_modules um ON u.id = um.user_id
       LEFT JOIN modules m ON um.module_id = m.id
       WHERE u.id = $1
       GROUP BY u.id`,
      [id]
    )

    const user = userResult.rows[0]

    res.json({
      message: 'User updated successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
        modules: user.modules
      },
    })
  } catch (error) {
    console.error('Update user error:', error)
    res.status(500).json({ message: 'Failed to update user' })
  }
})

// Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params

    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' })
    }

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' })
    }

    // Check if user exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE id = $1',
      [id]
    )

    if (existingUser.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Delete user sessions first
    await pool.query('DELETE FROM sessions WHERE user_id = $1', [id])

    // Delete user
    await pool.query('DELETE FROM users WHERE id = $1', [id])

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Delete user error:', error)
    res.status(500).json({ message: 'Failed to delete user' })
  }
})

export default router
