import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
import path from 'path'

dotenv.config({ path: path.join(__dirname, '../../.env') })

// Helper to ensure required env vars exist (for TypeScript type narrowing)
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`FATAL: ${name} environment variable is not configured`)
    process.exit(1)
  }
  return value
}

// Database configuration - DB_HOST and DB_PASSWORD are required
const pool = new Pool({
  host: requireEnv('DB_HOST'),
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'veriflow',
  user: process.env.DB_USER || 'postgres',
  password: requireEnv('DB_PASSWORD'),
})

async function seed() {
  console.log('🌱 Seeding database...')
  
  try {
    const client = await pool.connect()
    
    try {
      // Create default admin user (credentials from environment variables)
      const username = process.env.SEED_ADMIN_USERNAME || 'admin'
      const email = process.env.SEED_ADMIN_EMAIL || 'admin@veriflow.ai'
      const password = process.env.SEED_ADMIN_PASSWORD || 'ChangeThisPassword123!'
      
      // Check if user already exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [username, email]
      )
      
      if (existingUser.rows.length > 0) {
        console.log('✓ Default admin user already exists')
      } else {
        // Hash password
        const passwordHash = await bcrypt.hash(password, 12)
        
        // Create user
        await client.query(
          'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
          [username, email, passwordHash]
        )
        
        console.log('✓ Default admin user created')
        console.log(`  Username: ${username}`)
        console.log('  Password: [hidden - check SEED_ADMIN_PASSWORD in .env]')
      }
      
      // Create a test user as well (credentials from environment variables)
      const testUsername = process.env.SEED_TEST_USERNAME || 'test'
      const testEmail = process.env.SEED_TEST_EMAIL || 'test@veriflow.ai'
      const testPassword = process.env.SEED_TEST_PASSWORD || 'ChangeThisPassword123!'
      
      const existingTestUser = await client.query(
        'SELECT id FROM users WHERE username = $1 OR email = $2',
        [testUsername, testEmail]
      )
      
      if (existingTestUser.rows.length > 0) {
        console.log('✓ Test user already exists')
      } else {
        const testPasswordHash = await bcrypt.hash(testPassword, 12)
        
        await client.query(
          'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)',
          [testUsername, testEmail, testPasswordHash]
        )
        
        console.log('✓ Test user created')
        console.log(`  Username: ${testUsername}`)
        console.log('  Password: [hidden - check SEED_TEST_PASSWORD in .env]')
      }
      
      console.log('\n✅ Database seeding completed!')
      console.log('\n📋 Login Credentials:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('👤 Admin Account:')
      console.log(`   Email:    ${email}`)
      console.log(`   Username: ${username}`)
      console.log('   Password: [hidden - check SEED_ADMIN_PASSWORD in .env]')
      console.log('\n👤 Test Account:')
      console.log(`   Email:    ${testEmail}`)
      console.log(`   Username: ${testUsername}`)
      console.log('   Password: [hidden - check SEED_TEST_PASSWORD in .env]')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
      
    } finally {
      client.release()
    }
  } catch (error) {
    console.error('❌ Seeding error:', error)
    process.exit(1)
  } finally {
    await pool.end()
  }
}

seed()
