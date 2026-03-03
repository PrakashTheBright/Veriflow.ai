import { Pool } from 'pg'
import bcrypt from 'bcryptjs'
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

async function seed() {
  console.log('🌱 Seeding database...')
  
  try {
    const client = await pool.connect()
    
    try {
      // Create default admin user
      const username = 'admin'
      const email = 'admin@veriflow.ai'
      const password = 'admin123'
      
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
        console.log('  Username: admin')
        console.log('  Password: admin123')
      }
      
      // Create a test user as well
      const testUsername = 'test'
      const testEmail = 'test@veriflow.ai'
      const testPassword = 'test1234'
      
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
        console.log('  Username: test')
        console.log('  Password: test1234')
      }
      
      console.log('\n✅ Database seeding completed!')
      console.log('\n📋 Login Credentials:')
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.log('👤 Admin Account:')
      console.log('   Email:    admin@veriflow.ai')
      console.log('   Username: admin')
      console.log('   Password: admin123')
      console.log('\n👤 Test Account:')
      console.log('   Email:    test@veriflow.ai')
      console.log('   Username: test')
      console.log('   Password: test1234')
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
