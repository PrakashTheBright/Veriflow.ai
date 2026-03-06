import { Router, Request } from 'express'
import { spawn, exec } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import pool from '../database/init'

// Helper to get the ai-agent base path (works in both dev and production)
// In dev: __dirname = veriflow-ui/server/routes -> ../../../ = ai-agent
// In production: __dirname = veriflow-ui/dist/server/routes -> ../../../../ = ai-agent
const getBasePath = (): string => {
  // Check if running from dist folder (production)
  const isProduction = __dirname.includes(path.join('dist', 'server', 'routes')) || __dirname.includes('dist\\server\\routes')
  return isProduction 
    ? path.join(__dirname, '../../../../') // dist/server/routes -> ai-agent
    : path.join(__dirname, '../../../')    // server/routes -> ai-agent
}

// Extend Request to include user info from auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
    role: string
  }
}

const router = Router()

// Environment detection patterns
const ENV_PATTERNS = {
  production: ['prismforce.com', 'api.prismforce'],
  sit: ['pfsit'],
  uat: ['pfuat']
} as const

type EnvironmentType = keyof typeof ENV_PATTERNS

// Detect environment from URL
const detectEnvironment = (url: string): EnvironmentType | null => {
  if (!url) return null
  for (const [env, patterns] of Object.entries(ENV_PATTERNS)) {
    if (patterns.some(pattern => url.includes(pattern))) {
      return env as EnvironmentType
    }
  }
  return null
}

// Get credentials for environment from process.env
const getUICredentials = (env: EnvironmentType | null) => {
  const defaults = {
    username: process.env.APP_USERNAME || 'testuser11@gmail.com',
    password: process.env.APP_PASSWORD || '@!agent_123'
  }
  
  switch (env) {
    case 'production':
      return {
        username: process.env.PROD_APP_USERNAME || 'prismforce_sp_system@prismforce.ai',
        password: process.env.PROD_APP_PASSWORD || '@!agent_123'
      }
    case 'sit':
      return {
        username: process.env.SIT_APP_USERNAME || 'testuser11@gmail.com',
        password: process.env.SIT_APP_PASSWORD || '@!agent_123'
      }
    case 'uat':
      return {
        username: process.env.UAT_APP_USERNAME || 'testuser11@gmail.com',
        password: process.env.UAT_APP_PASSWORD || '@!agent_123'
      }
    default:
      return defaults
  }
}

// Get API credentials for environment from process.env
const getAPICredentials = (env: EnvironmentType | null) => {
  switch (env) {
    case 'production':
      return {
        apiKey: process.env.PROD_API_KEY,
        clientId: process.env.PROD_API_CLIENT_ID
      }
    case 'sit':
      return {
        apiKey: process.env.SIT_API_KEY,
        clientId: process.env.SIT_API_CLIENT_ID
      }
    case 'uat':
      return {
        apiKey: process.env.UAT_API_KEY,
        clientId: process.env.UAT_API_CLIENT_ID
      }
    default:
      return { apiKey: undefined, clientId: undefined }
  }
}

// Sort files with preferred order first, then alphabetically
const sortWithPreferredOrder = (files: string[], preferredOrder: string[]): string[] => {
  return [...files].sort((a, b) => {
    const ia = preferredOrder.indexOf(a)
    const ib = preferredOrder.indexOf(b)
    if (ia !== -1 || ib !== -1) {
      if (ia === -1) return 1
      if (ib === -1) return -1
      return ia - ib
    }
    return a.localeCompare(b)
  })
}

// Parse Playwright JSON output to extract test results
const parsePlaywrightResults = (output: string): { passed: number; failed: number; total: number } => {
  let passed = 0, failed = 0, total = 0
  
  try {
    const jsonMatch = output.match(/\{[\s\S]*"suites"[\s\S]*\}/g)
    if (jsonMatch && jsonMatch.length > 0) {
      const results = JSON.parse(jsonMatch[jsonMatch.length - 1])
      
      const processSpecs = (specs: any[]) => {
        specs?.forEach((spec: any) => {
          total++
          if (spec.ok) passed++
          else failed++
        })
      }
      
      results.suites?.forEach((file: any) => {
        file.suites?.forEach((suite: any) => processSpecs(suite.specs))
        processSpecs(file.specs)
      })
    }
  } catch (e) {
    // Parsing failed
  }
  
  return { passed, failed, total }
}

// Extract response bodies from Playwright JSON output
const extractResponseBodies = (output: string, testId: string): any[] => {
  const responses: any[] = []
  
  try {
    const jsonMatch = output.match(/\{[\s\S]*"suites"[\s\S]*\}/g)
    if (!jsonMatch) return responses
    
    const results = JSON.parse(jsonMatch[jsonMatch.length - 1])
    
    // Recursively extract stdout from all test results
    const extractFromResults = (results: any[]) => {
      results?.forEach(result => {
        result.stdout?.forEach((outputItem: any) => {
          if (outputItem.text?.includes('Response Body:')) {
            try {
              const marker = outputItem.text.includes('Application Response Body:') 
                ? 'Application Response Body:' 
                : 'Response Body:'
              const bodyStart = outputItem.text.indexOf(marker) + marker.length
              const jsonText = outputItem.text.substring(bodyStart).trim()
              responses.push(JSON.parse(jsonText))
            } catch (e) {
              console.warn(`[API Test ${testId}] Failed to parse response`)
            }
          }
        })
      })
    }
    
    results.suites?.forEach((file: any) => {
      file.suites?.forEach((suite: any) => {
        suite.specs?.forEach((spec: any) => {
          spec.tests?.forEach((test: any) => extractFromResults(test.results))
        })
      })
    })
  } catch (e) {
    console.error(`[API Test ${testId}] Error extracting responses:`, e)
  }
  
  return responses
}

// Get UI test cases from test-cases/approved/
router.get('/ui', async (req, res) => {
  try {
    const basePath = getBasePath()
    const testCasesPath = path.join(basePath, 'test-cases/approved')
    const files = await fs.readdir(testCasesPath)
    
    // Preferred ordering for UI tests
    const preferredOrder = [
      'full-assessment-flow.md',
      'send-invite-email.md',
      'send-reminder-email.md',
      'send-reminder-ivr.md',
      'extend-interview-expiry.md',
    ]

    const mdFiles = files.filter((file) => file.endsWith('.md'))
    const sortedFiles = sortWithPreferredOrder(mdFiles, preferredOrder)

    const testCases = sortedFiles.map((file, index) => ({
      id: `ui-${index + 1}`,
      name: file.replace('.md', '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      fileName: file,
      type: 'ui',
      status: 'pending',
    }))

    res.json({ testCases })
  } catch (error) {
    console.error('Error reading UI test cases:', error)
    res.status(500).json({ message: 'Failed to load UI test cases' })
  }
})

// Get API test cases from api-test/
router.get('/api', async (req, res) => {
  try {
    const basePath = getBasePath()
    const apiTestPath = path.join(basePath, 'api-test')
    
    // Check if directory exists
    try {
      await fs.access(apiTestPath)
    } catch {
      // Create directory if it doesn't exist
      await fs.mkdir(apiTestPath, { recursive: true })
    }

    const files = await fs.readdir(apiTestPath)
    
    // Preferred ordering for API tests
    const preferredOrder = [
      'e2e-complete-workflow.json',
      'create-assessment.json',
      'create-candidate.json',
      'add-resume-to-candidate.json',
      'attach-candidate-to-assessment.json',
    ]

    const jsonFiles = files.filter((file) => file.endsWith('.json') || file.endsWith('.yaml'))
    const sortedFiles = sortWithPreferredOrder(jsonFiles, preferredOrder)

    const testCases = sortedFiles.map((file, index) => ({
      id: `api-${index + 1}`,
      name: file.replace(/\.(json|yaml)$/, '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      fileName: file,
      type: 'api',
      status: 'pending',
    }))

    res.json({ testCases })
  } catch (error) {
    console.error('Error reading API test cases:', error)
    res.status(500).json({ message: 'Failed to load API test cases' })
  }
})

// Execute a test
router.post('/execute', async (req: AuthRequest, res) => {
  const { testId, type, fileName, environmentUrl, environmentConfig, environmentName } = req.body
  const userId = req.user?.id || null
  const io = req.app.get('io')
  const executionId = uuidv4()

  try {
    // Determine test file path
    const basePath = getBasePath()
    const testFile = type === 'ui' 
      ? path.join(basePath, 'test-cases/approved', fileName)
      : path.join(basePath, 'api-test', fileName)

    // Check if file exists
    try {
      await fs.access(testFile)
    } catch {
      return res.status(404).json({ 
        success: false, 
        message: `Test file not found: ${fileName}` 
      })
    }

    // Emit start event
    io.emit(`test:${testId}:status`, {
      status: 'running',
      progress: 0,
      message: 'Starting test execution...',
    })

    // Store execution in database
    await pool.query(
      `INSERT INTO test_executions (id, user_id, test_name, test_type, file_name, status, started_at)
       VALUES ($1, $2, $3, $4, $5, 'running', NOW())`,
      [executionId, userId, fileName.replace(/\.(md|json|yaml)$/, ''), type, fileName]
    )

    // For UI tests, use the AI agent
    if (type === 'ui') {
      const startTime = Date.now()
      
      // Build environment variables
      const agentEnv = { ...process.env }
      agentEnv.AGENT_KEEP_BROWSER_OPEN = 'false' // Ensure browser closes
      
      // Determine environment type from environment name first, then fall back to URL detection
      let env: EnvironmentType | null = null
      if (environmentName) {
        // Map environment name to environment type
        const envNameLower = environmentName.toLowerCase()
        if (envNameLower.includes('production') || envNameLower.includes('prod')) {
          env = 'production'
        } else if (envNameLower.includes('sit')) {
          env = 'sit'
        } else if (envNameLower.includes('uat')) {
          env = 'uat'
        }
        console.log(`[UI Test ${testId}] Environment from name '${environmentName}': ${env || 'default'}`)
      }
      
      // Fall back to URL detection if environment name mapping didn't work
      if (!env && environmentUrl) {
        env = detectEnvironment(environmentUrl)
        console.log(`[UI Test ${testId}] Environment from URL detection: ${env || 'default'}`)
      }
      
      // Set APP_URL - prioritize client URL, then environment-specific URL from .env
      if (environmentUrl) {
        agentEnv.APP_URL = environmentUrl
        console.log(`[UI Test ${testId}] Using APP_URL from client: ${environmentUrl}`)
      } else if (env) {
        // Use environment-specific URL from .env
        const envUrls: Record<EnvironmentType, string | undefined> = {
          production: process.env.PROD_APP_URL,
          sit: process.env.SIT_APP_URL,
          uat: process.env.UAT_APP_URL,
        }
        const envUrl = envUrls[env]
        if (envUrl) {
          agentEnv.APP_URL = envUrl
          console.log(`[UI Test ${testId}] Using APP_URL from .env for ${env}: ${envUrl}`)
        }
      }
      
      // Get environment-specific credentials from .env based on resolved environment
      const creds = getUICredentials(env)
      agentEnv.APP_USERNAME = creds.username
      agentEnv.APP_PASSWORD = creds.password
      console.log(`[UI Test ${testId}] Using ${env || 'default'} credentials from .env`)
      
      // Override with provided credentials if any (takes precedence)
      if (environmentConfig?.username) {
        agentEnv.APP_USERNAME = environmentConfig.username
        console.log(`[UI Test ${testId}] Overriding with provided username: ${environmentConfig.username}`)
      }
      if (environmentConfig?.password) {
        agentEnv.APP_PASSWORD = environmentConfig.password
        console.log(`[UI Test ${testId}] Overriding with provided password`)
      }
      
      // Log final environment configuration
      console.log(`[UI Test ${testId}] Final configuration:`)      
      console.log(`[UI Test ${testId}]   APP_URL: ${agentEnv.APP_URL}`)      
      console.log(`[UI Test ${testId}]   APP_USERNAME: ${agentEnv.APP_USERNAME}`)
      
      // Run the AI agent
      const agentProcess = spawn('node', [
        path.join(basePath, 'dist/index.js'),
        testFile,
      ], {
        cwd: basePath,
        env: agentEnv,
      })

      let output = ''
      let errorOutput = ''
      let reportCompleted = false
      let maxProgress = 0  // Track max progress to ensure final is 100

      agentProcess.stdout.on('data', (data) => {
        output += data.toString()
        
        // Parse progress from output - looking for [X/Y] format (get the last match)
        const progressMatches = output.matchAll(/\[(\d+)\/(\d+)\]/gi)
        let lastMatch = null
        for (const match of progressMatches) {
          lastMatch = match
        }
        if (lastMatch && !reportCompleted) {
          const current = parseInt(lastMatch[1])
          const total = parseInt(lastMatch[2])
          let progress = Math.round((current / total) * 100)
          // Cap at 98% during execution (leave room for report generation and final completion)
          // This ensures we can always reach 100% on completion
          progress = Math.min(progress, 98)
          
          if (progress > maxProgress) {
            maxProgress = progress
            console.log(`[Test ${testId}] Progress update: ${current}/${total} = ${progress}%`)
            io.emit(`test:${testId}:status`, {
              status: 'running',
              progress,
              message: `Executing step ${current} of ${total}...`,
            })
          }
        }
      })

      agentProcess.stderr.on('data', (data) => {
        errorOutput += data.toString()
      })

      // Handle process exit/close with timeout failsafe
      let processExited = false
      const exitHandler = async (code: number | null, signal: string | null) => {
        if (processExited) return  // Prevent double-execution
        processExited = true
        
        console.log(`[Test ${testId}] Process exited with code ${code}, signal ${signal}`)
        
        const duration = Date.now() - startTime
        const success = code === 0 && !signal
        reportCompleted = true

        // Parse results from output
        const passedMatch = output.match(/Passed:\s*(\d+)/i)
        const failedMatch = output.match(/Failed:\s*(\d+)/i)
        const totalMatch = output.match(/Actions:\s*(\d+)/i)

        const passed = passedMatch ? parseInt(passedMatch[1]) : 0
        const failed = failedMatch ? parseInt(failedMatch[1]) : 0
        const total = totalMatch ? parseInt(totalMatch[1]) : passed + failed

        // Get report path
        const reportMatch = output.match(/Report generated:\s*(.+\.html)/i)
        const reportPath = reportMatch ? reportMatch[1] : null

        try {
          // Update database
          await pool.query(
            `UPDATE test_executions 
             SET status = $1, duration = $2, total_actions = $3, passed_actions = $4, 
                 failed_actions = $5, report_path = $6, completed_at = NOW()
             WHERE id = $7`,
            [success ? 'passed' : 'failed', duration, total, passed, failed, reportPath, executionId]
          )
        } catch (dbError) {
          console.error(`[Test ${testId}] Database update error:`, dbError)
        }

        // Emit completion event with 100% progress - ALWAYS set progress to 100 on completion
        const completionEvent = {
          status: success ? 'passed' : 'failed',
          progress: 100,  // ALWAYS 100 on completion
          duration,
          reportPath,
          message: success ? 'Test completed successfully' : 'Test failed',
        }
        console.log(`[Test ${testId}] Emitting completion:`, completionEvent)
        io.emit(`test:${testId}:status`, completionEvent)
      }

      agentProcess.on('close', (code) => exitHandler(code, null))
      agentProcess.on('exit', (code) => exitHandler(code, null))
      agentProcess.on('error', (err) => {
        console.error(`[Test ${testId}] Process error:`, err)
        exitHandler(1, 'error')
      })

      // Force timeout after 5 minutes to prevent hanging
      const timeoutHandle = setTimeout(() => {
        if (!processExited) {
          console.warn(`[Test ${testId}] Timeout: Force killing process after 5 minutes`)
          agentProcess.kill('SIGKILL')
        }
      }, 5 * 60 * 1000)

      // Cleanup timeout handle when process exits
      agentProcess.on('close', () => {
        clearTimeout(timeoutHandle)
      })

      // Return immediately, let the process run in background
      res.json({
        success: true,
        executionId,
        message: 'Test execution started',
      })
    } else {
      // For API tests (Playwright spec files), execute them using npx playwright test
      const startTime = Date.now()
      
      // Read the JSON file to get the spec file name
      let specFile = fileName
      try {
        const jsonPath = path.join(basePath, 'api-test', fileName)
        const testConfigContent = await fs.readFile(jsonPath, 'utf-8')
        const testConfig = JSON.parse(testConfigContent)
        if (testConfig.specFile) {
          specFile = testConfig.specFile
        }
      } catch (error) {
        console.warn(`Could not read test config from ${fileName}, using as spec file directly`)
      }

      // Emit start event
      io.emit(`test:${testId}:status`, {
        status: 'running',
        progress: 10,
        message: 'Starting API test execution...',
      })

      // Run Playwright test
      const relativeSpecPath = `api-test/${specFile}`.replace(/\\/g, '/')
      const command = `npx playwright test "${relativeSpecPath}" --reporter=json`
      console.log(`[API Test ${testId}] Executing: ${command}`)
      
      // Build environment variables for API tests
      const apiTestEnv = { ...process.env }
      
      // Determine environment type from environment name first, then fall back to URL detection
      let env: EnvironmentType | null = null
      if (environmentName) {
        // Map environment name to environment type
        const envNameLower = environmentName.toLowerCase()
        if (envNameLower.includes('production') || envNameLower.includes('prod')) {
          env = 'production'
        } else if (envNameLower.includes('sit')) {
          env = 'sit'
        } else if (envNameLower.includes('uat')) {
          env = 'uat'
        }
        console.log(`[API Test ${testId}] Environment from name '${environmentName}': ${env || 'default'}`)
      }
      
      // Fall back to URL detection if environment name mapping didn't work
      if (!env && environmentUrl) {
        env = detectEnvironment(environmentUrl)
        console.log(`[API Test ${testId}] Environment from URL detection: ${env || 'default'}`)
      }
      
      // Get environment-specific credentials from .env based on resolved environment
      const envCreds = getAPICredentials(env)
      
      // Set API_BASE_URL - prioritize environment-specific URL from .env if client URL is empty
      if (environmentUrl) {
        apiTestEnv.API_BASE_URL = environmentUrl
        console.log(`[API Test ${testId}] Using API Base URL from client: ${environmentUrl}`)
      } else if (env) {
        // Use environment-specific URL from .env
        const envUrls: Record<EnvironmentType, string | undefined> = {
          production: process.env.PROD_API_BASE_URL,
          sit: process.env.SIT_API_BASE_URL,
          uat: process.env.UAT_API_BASE_URL,
        }
        const envUrl = envUrls[env]
        if (envUrl) {
          apiTestEnv.API_BASE_URL = envUrl
          console.log(`[API Test ${testId}] Using API Base URL from .env for ${env}: ${envUrl}`)
        }
      }
      
      // Get API credentials - prioritize client config, then environment-specific .env values
      let apiKey = environmentConfig?.apiKey?.trim() || envCreds.apiKey
      let clientId = environmentConfig?.clientId?.trim() || envCreds.clientId
      
      if (apiKey) {
        apiTestEnv.API_KEY = apiKey
        console.log(`[API Test ${testId}] Using API Key: ${apiKey.substring(0, 8)}...`)
      }
      if (clientId) {
        apiTestEnv.API_CLIENT_ID = clientId
        console.log(`[API Test ${testId}] Using Client ID: ${clientId}`)
      }
      
      exec(command, {
        cwd: basePath,
        env: apiTestEnv,
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
      }, async (error, stdout, stderr) => {
        const testOutput = stdout
        const testError = stderr
        const code = error ? error.code || 1 : 0
        const duration = Date.now() - startTime
        const success = code === 0

        // Extract API response data using helper function
        console.log(`[API Test ${testId}] Parsing JSON output (length: ${testOutput.length} chars)`)
        const allResponses = extractResponseBodies(testOutput, testId)
        const responseData = allResponses.length > 0 ? allResponses[allResponses.length - 1] : null
        
        if (responseData) {
          console.log(`[API Test ${testId}] ✓ Captured response (${allResponses.length} total) with jobId:`, 
            responseData.data?.[0]?.jobId || responseData.data?.[0]?.applicationId || responseData.data?.[0]?.candidateId || 'N/A')
        }

        // Parse test results using helper function
        let { passed, failed, total } = parsePlaywrightResults(testOutput)
        
        // Fallback if parsing failed
        if (total === 0) {
          total = 1
          if (success) {
            passed = 1
          } else {
            failed = 1
          }
        }

        try {
          // Update database
          await pool.query(
            `UPDATE test_executions 
             SET status = $1, duration = $2, total_actions = $3, passed_actions = $4, 
                 failed_actions = $5, error_message = $6, response_data = $7, completed_at = NOW()
             WHERE id = $8`,
            [success ? 'passed' : 'failed', duration, total, passed, failed, success ? null : testError, responseData ? JSON.stringify(responseData) : null, executionId]
          )
        } catch (dbError) {
          console.error(`[API Test ${testId}] Database update error:`, dbError)
        }

        io.emit(`test:${testId}:status`, {
          status: success ? 'passed' : 'failed',
          executionId,
          progress: 100,
          duration,
          message: success ? 'API test passed' : 'API test failed',
          passed,
          failed,
          total,
        })
      })

      res.json({
        success: true,
        executionId,
        message: 'API test execution started',
      })
    }
  } catch (error) {
    console.error('Test execution error:', error)
    
    io.emit(`test:${testId}:status`, {
      status: 'failed',
      progress: 100,
      message: 'Test execution failed',
    })

    res.status(500).json({
      success: false,
      message: 'Failed to execute test',
    })
  }
})

// Get execution status
router.get('/execution/:id', async (req, res) => {
  try {
    const { id } = req.params
    const result = await pool.query(
      'SELECT * FROM test_executions WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Execution not found' })
    }

    const execution = result.rows[0]
    
    // Parse response_data if it's a JSON string
    if (execution.response_data && typeof execution.response_data === 'string') {
      try {
        execution.response_data = JSON.parse(execution.response_data)
      } catch (e) {
        console.warn('Could not parse response_data:', e)
      }
    }

    res.json(execution)
  } catch (error) {
    console.error('Error fetching execution:', error)
    res.status(500).json({ message: 'Failed to fetch execution' })
  }
})

export default router
