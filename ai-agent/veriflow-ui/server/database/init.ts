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
