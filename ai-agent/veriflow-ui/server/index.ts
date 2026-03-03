import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { createServer } from 'http'
import { Server as SocketServer } from 'socket.io'
import dotenv from 'dotenv'
import path from 'path'

import authRoutes from './routes/auth'
import testRoutes from './routes/tests'
import reportRoutes from './routes/reports'
import userRoutes from './routes/users'
import testCaseRoutes from './routes/testcases'
import testcaseHistoryRoutes from './routes/testcaseHistory'
import credentialsRoutes from './routes/credentials'
import { initDatabase } from './database/init'
import { autoCleanup } from './utils/cleanup'
import { checkModuleAccess } from './middleware/moduleAccess'

// Load environment variables from both ai-agent/.env and veriflow-ui/.env
dotenv.config({ path: path.join(__dirname, '../../.env') }) // ai-agent/.env (primary)
dotenv.config({ path: path.join(__dirname, '../.env') }) // veriflow-ui/.env (fallback)

const app = express()
const httpServer = createServer(app)
const io = new SocketServer(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'development' 
      ? ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000']
      : process.env.CLIENT_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
  },
})

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for serving HTML reports
}))
app.use(cors({
  origin: process.env.NODE_ENV === 'development' 
    ? ['http://localhost:5173', 'http://localhost:3001', 'http://localhost:3000']
    : process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())

// Serve static reports
app.use('/reports', express.static(path.join(__dirname, '../../reports')))

// Make io available to routes
app.set('io', io)

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/tests', checkModuleAccess, testRoutes)
app.use('/api/reports', checkModuleAccess, reportRoutes)
app.use('/api/users', checkModuleAccess, userRoutes)
app.use('/api/testcases', checkModuleAccess, testCaseRoutes)
app.use('/api/testcase-history', checkModuleAccess, testcaseHistoryRoutes)
app.use('/api/credentials', checkModuleAccess, credentialsRoutes)

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)

  socket.on('subscribe:test', (testId: string) => {
    socket.join(`test:${testId}`)
    console.log(`Client ${socket.id} subscribed to test:${testId}`)
  })

  socket.on('unsubscribe:test', (testId: string) => {
    socket.leave(`test:${testId}`)
  })

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

// Initialize database and start server
const PORT = process.env.PORT || 4000

async function start() {
  // Try to initialize database, but don't fail if unavailable
  await initDatabase()
  
  // Auto-cleanup old reports if too many exist
  await autoCleanup()

  httpServer.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 VeriFlow AI Server Running                           ║
║                                                            ║
║   Local:    http://localhost:${PORT}                        ║
║   API:      http://localhost:${PORT}/api                    ║
║   Health:   http://localhost:${PORT}/api/health             ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
    `)
  })
}

start()

export { io }
