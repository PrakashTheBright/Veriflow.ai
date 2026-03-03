import { Pool } from 'pg'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'veriflow_ai',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
})

let dbAvailable = false

export async function initDatabase() {
  try {
    const client = await pool.connect()
    
    try {
      // Create users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          username VARCHAR(255) UNIQUE NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

      // Create test_executions table
      await client.query(`
        CREATE TABLE IF NOT EXISTS test_executions (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID REFERENCES users(id),
          test_name VARCHAR(255) NOT NULL,
          test_type VARCHAR(50) NOT NULL,
          file_name VARCHAR(255) NOT NULL,
          status VARCHAR(50) NOT NULL DEFAULT 'pending',
          duration INTEGER,
          total_actions INTEGER,
          passed_actions INTEGER,
          failed_actions INTEGER,
          report_path VARCHAR(500),
          error_message TEXT,
          response_data JSONB,
          started_at TIMESTAMP,
          completed_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `)

    // Create reports table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        execution_id UUID REFERENCES test_executions(id),
        user_id UUID REFERENCES users(id),
        name VARCHAR(255) NOT NULL,
        test_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        pass_rate DECIMAL(5,2),
        total_tests INTEGER,
        passed_tests INTEGER,
        failed_tests INTEGER,
        duration INTEGER,
        file_path VARCHAR(500) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id),
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create modules table - defines all available modules in the system
    await client.query(`
      CREATE TABLE IF NOT EXISTS modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) UNIQUE NOT NULL,
        path VARCHAR(255) NOT NULL,
        icon VARCHAR(100),
        description VARCHAR(500),
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create user_modules table - maps users to their accessible modules
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_modules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        module_id UUID REFERENCES modules(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, module_id)
      )
    `)

    // Insert default modules if not exist
    await client.query(`
      INSERT INTO modules (name, path, icon, description, display_order) VALUES
        ('Dashboard', '/app', 'LayoutDashboard', 'Main dashboard with overview and statistics', 1),
        ('UI Testing', '/app/ui-testing', 'Globe', 'Execute and manage UI automation tests', 2),
        ('API Testing', '/app/api-testing', 'Cpu', 'Execute and manage API tests', 3),
        ('Reports', '/app/reports', 'FileText', 'View test execution reports and analytics', 4),
        ('Create Test Cases', '/app/create-testcases', 'FilePlus', 'Generate AI-powered test cases', 5),
        ('Users', '/app/users', 'Users', 'Manage user accounts and permissions', 6),
        ('Environments', '/app/environments', 'Server', 'Configure testing environments', 7)
      ON CONFLICT (name) DO NOTHING
    `)

      // Add response_data column to test_executions if it doesn't exist
      await client.query(`
        ALTER TABLE test_executions 
        ADD COLUMN IF NOT EXISTS response_data JSONB
      `)

      // Add role column to users table if it doesn't exist
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user'
      `)

      // Update admin user role if exists
      await client.query(`
        UPDATE users 
        SET role = 'admin' 
        WHERE email = 'admin@veriflow.ai' OR username = 'admin'
      `)

      // Grant all modules to admin users
      await client.query(`
        INSERT INTO user_modules (user_id, module_id)
        SELECT u.id, m.id
        FROM users u
        CROSS JOIN modules m
        WHERE u.role = 'admin'
        ON CONFLICT (user_id, module_id) DO NOTHING
      `)

      // Create index on user_modules for faster lookup
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_user_modules_user_id 
        ON user_modules(user_id)
      `)

      // Create indexes for better query performance
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_test_executions_completed_at 
        ON test_executions(completed_at DESC)
      `)
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_test_executions_status 
        ON test_executions(status)
      `)
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_test_executions_test_type 
        ON test_executions(test_type)
      `)
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_test_executions_test_name 
        ON test_executions(test_name)
      `)
      
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_test_executions_started_at 
        ON test_executions(started_at)
      `)

      console.log('✓ Database indexes created successfully')

    dbAvailable = true
    console.log('✓ Database tables created successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
    throw error
  } finally {
    client.release()
  }
  } catch (error) {
    console.warn('⚠ Database connection failed. Running in demo mode without persistence.')
    console.warn('  To enable full functionality, ensure PostgreSQL is running and configured.')
    dbAvailable = false
  }
}

export function isDatabaseAvailable() {
  return dbAvailable
}

export default pool
