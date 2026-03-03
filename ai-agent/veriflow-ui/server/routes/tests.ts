import { Router } from 'express'
import { spawn, exec } from 'child_process'
import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'
import pool from '../database/init'

const router = Router()

// Get UI test cases from test-cases/approved/
router.get('/ui', async (req, res) => {
  try {
    const testCasesPath = path.join(__dirname, '../../../test-cases/approved')
    const files = await fs.readdir(testCasesPath)
    
    // Preferred ordering for UI tests (put these first in this exact sequence)
    const preferredOrder = [
      'full-assessment-flow.md',
      'send-invite-email.md',
      'send-reminder-email.md',
      'send-reminder-ivr.md',
      'extend-interview-expiry.md',
    ]

    const mdFiles = files.filter((file) => file.endsWith('.md'))

    // Sort files: preferred ones first in the specified order, then the rest alphabetically
    mdFiles.sort((a, b) => {
      const ia = preferredOrder.indexOf(a)
      const ib = preferredOrder.indexOf(b)
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      }
      return a.localeCompare(b)
    })

    const testCases = mdFiles.map((file, index) => ({
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
    const apiTestPath = path.join(__dirname, '../../../api-test')
    
    // Check if directory exists
    try {
      await fs.access(apiTestPath)
    } catch {
      // Create directory if it doesn't exist
      await fs.mkdir(apiTestPath, { recursive: true })
    }

    const files = await fs.readdir(apiTestPath)
    
    // Preferred ordering for API tests (put these first in this exact sequence)
    const preferredOrder = [
      'e2e-complete-workflow.json',
      'create-assessment.json',
      'create-candidate.json',
      'add-resume-to-candidate.json',
      'attach-candidate-to-assessment.json',
    ]

    const jsonFiles = files.filter((file) => file.endsWith('.json') || file.endsWith('.yaml'))

    // Sort files: preferred ones first in the specified order, then the rest alphabetically
    jsonFiles.sort((a, b) => {
      const ia = preferredOrder.indexOf(a)
      const ib = preferredOrder.indexOf(b)
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1
        if (ib === -1) return -1
        return ia - ib
      }
      return a.localeCompare(b)
    })

    const testCases = jsonFiles
      .map((file, index) => ({
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
router.post('/execute', async (req, res) => {
  const { testId, type, fileName, environmentUrl, environmentConfig } = req.body
  const io = req.app.get('io')
  const executionId = uuidv4()

  try {
    // Determine test file path
    const basePath = path.join(__dirname, '../../..')
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
      `INSERT INTO test_executions (id, test_name, test_type, file_name, status, started_at)
       VALUES ($1, $2, $3, $4, 'running', NOW())`,
      [executionId, fileName.replace(/\.(md|json|yaml)$/, ''), type, fileName]
    )

    // For UI tests, use the AI agent
    if (type === 'ui') {
      const startTime = Date.now()
      
      // Build environment variables, override APP_URL if provided
      // Ensure UI-launched agent does not keep the browser open (UI should not hang)
      const agentEnv = { ...process.env }
      // Force keep-browser-open to false to ensure browser closes and process exits
      agentEnv.AGENT_KEEP_BROWSER_OPEN = 'false'
      if (environmentUrl) {
        agentEnv.APP_URL = environmentUrl
        console.log(`Using environment URL: ${environmentUrl}`)
        
        // Set credentials based on environment URL from .env
        if (environmentUrl.includes('prismforce.com')) {
          // Production
          agentEnv.APP_USERNAME = process.env.PROD_APP_USERNAME || 'prismforce_sp_system@prismforce.ai'
          agentEnv.APP_PASSWORD = process.env.PROD_APP_PASSWORD || '@!agent_123'
          console.log(`[UI Test ${testId}] Using Production credentials`)
        } else if (environmentUrl.includes('pfsit')) {
          // SIT
          agentEnv.APP_USERNAME = process.env.SIT_APP_USERNAME || 'prismforce_sp_sit@prismforce.ai'
          agentEnv.APP_PASSWORD = process.env.SIT_APP_PASSWORD || '@!agent_123'
          console.log(`[UI Test ${testId}] Using SIT credentials`)
        } else if (environmentUrl.includes('pfuat')) {
          // UAT
          agentEnv.APP_USERNAME = process.env.UAT_APP_USERNAME || 'testuser11@gmail.com'
          agentEnv.APP_PASSWORD = process.env.UAT_APP_PASSWORD || '@!agent_123'
          console.log(`[UI Test ${testId}] Using UAT credentials`)
        }
      }
      
      // Also use credentials from environmentConfig if provided (takes precedence)
      if (environmentConfig?.username) {
        agentEnv.APP_USERNAME = environmentConfig.username
        console.log(`[UI Test ${testId}] Using provided username: ${environmentConfig.username}`)
      }
      if (environmentConfig?.password) {
        agentEnv.APP_PASSWORD = environmentConfig.password
        console.log(`[UI Test ${testId}] Using provided password`)
      }
      
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
      const exitHandler = async (code, signal) => {
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

      // Run Playwright test using exec for better Windows compatibility
      const relativeSpecPath = `api-test/${specFile}`.replace(/\\/g, '/')
      const command = `npx playwright test "${relativeSpecPath}" --reporter=json`
      console.log(`[API Test ${testId}] Executing: ${command}`)
      console.log(`[API Test ${testId}] Working directory: ${basePath}`)
      
      // Build environment variables for API tests
      const apiTestEnv = { ...process.env }
      
      // Determine which environment we're targeting
      const isProduction = environmentUrl?.includes('prismforce.com') || environmentUrl?.includes('api.prismforce');
      const isSIT = environmentUrl?.includes('pfsit');
      const isUAT = environmentUrl?.includes('pfuat');
      
      console.log(`[API Test ${testId}] Environment detection - URL: ${environmentUrl}, Production: ${isProduction}, SIT: ${isSIT}, UAT: ${isUAT}`);
      
      // Set API_BASE_URL
      if (environmentUrl) {
        apiTestEnv.API_BASE_URL = environmentUrl
        console.log(`[API Test ${testId}] Using API Base URL: ${environmentUrl}`)
      }
      
      // Get API Key - use provided value, or fall back to .env based on environment
      let apiKey = environmentConfig?.apiKey;
      if (!apiKey || apiKey.trim() === '') {
        if (isProduction) {
          apiKey = process.env.PROD_API_KEY;
          console.log(`[API Test ${testId}] Using fallback PROD_API_KEY from .env`);
        } else if (isUAT) {
          apiKey = process.env.UAT_API_KEY;
          console.log(`[API Test ${testId}] Using fallback UAT_API_KEY from .env`);
        } else if (isSIT) {
          apiKey = process.env.SIT_API_KEY;
          console.log(`[API Test ${testId}] Using fallback SIT_API_KEY from .env`);
        }
      }
      if (apiKey) {
        apiTestEnv.API_KEY = apiKey
        console.log(`[API Test ${testId}] Using API Key: ${apiKey.substring(0, 8)}...`)
      }
      
      // Get Client ID - use provided value, or fall back to .env based on environment
      let clientId = environmentConfig?.clientId;
      if (!clientId || clientId.trim() === '') {
        if (isProduction) {
          clientId = process.env.PROD_API_CLIENT_ID;
          console.log(`[API Test ${testId}] Using fallback PROD_API_CLIENT_ID from .env`);
        } else if (isUAT) {
          clientId = process.env.UAT_API_CLIENT_ID;
          console.log(`[API Test ${testId}] Using fallback UAT_API_CLIENT_ID from .env`);
        } else if (isSIT) {
          clientId = process.env.SIT_API_CLIENT_ID;
          console.log(`[API Test ${testId}] Using fallback SIT_API_CLIENT_ID from .env`);
        }
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

        // Extract API response data from console output  
        let responseData = null
        try {
          console.log(`[API Test ${testId}] Parsing JSON output (length: ${testOutput.length} chars)`)
          // First, try to extract from JSON reporter output
          const jsonMatch = testOutput.match(/\{[\s\S]*"suites"[\s\S]*\}/g)
          if (jsonMatch && jsonMatch.length > 0) {
            const results = JSON.parse(jsonMatch[jsonMatch.length - 1])
            console.log(`[API Test ${testId}] Found ${results.suites?.length || 0} test suites`)
            // Look for Response Body in stdout - capture the LAST one (for multi-step tests)
            let allResponses: any[] = []
            if (results.suites) {
              for (const file of results.suites) {
                if (file.suites) {
                  for (const suite of file.suites) {
                    if (suite.specs) {
                      for (const spec of suite.specs) {
                        if (spec.tests) {
                          for (const test of spec.tests) {
                            if (test.results) {
                              for (const result of test.results) {
                                if (result.stdout) {
                                  console.log(`[API Test ${testId}] Checking ${result.stdout.length} stdout entries`)
                                  for (const output of result.stdout) {
                                    if (output.text && (output.text.includes('Application Response Body:') || output.text.includes('Response Body:'))) {
                                      try {
                                        // Extract JSON - it includes newlines in the text
                                        let bodyStart: number
                                        if (output.text.includes('Application Response Body:')) {
                                          bodyStart = output.text.indexOf('Application Response Body:') + 'Application Response Body:'.length
                                        } else {
                                          bodyStart = output.text.indexOf('Response Body:') + 'Response Body:'.length
                                        }
                                        const jsonText = output.text.substring(bodyStart).trim()
                                        const parsedResponse = JSON.parse(jsonText)
                                        allResponses.push(parsedResponse)
                                      } catch (e) {
                                        console.warn(`[API Test ${testId}] Failed to parse response:`, e)
                                      }
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
            // Use the last response (most relevant for multi-step tests)
            if (allResponses.length > 0) {
              responseData = allResponses[allResponses.length - 1]
              console.log(`[API Test ${testId}] ✓ Captured response (${allResponses.length} total) with jobId:`, responseData.data?.[0]?.jobId || responseData.data?.[0]?.applicationId || responseData.data?.[0]?.candidateId || 'N/A')
            }
          }
        } catch (parseErr) {
          console.error(`[API Test ${testId}] Error parsing response data:`, parseErr)
        }

        // Parse test results from JSON output
        let passed = 0
        let failed = 0
        let total = 0
        
        try {
          // Try to parse JSON reporter output
          const jsonMatch = testOutput.match(/\{[\s\S]*"suites"[\s\S]*\}/g)
          if (jsonMatch && jsonMatch.length > 0) {
            const results = JSON.parse(jsonMatch[jsonMatch.length - 1])
            if (results.suites && results.suites.length > 0) {
              results.suites.forEach((file: any) => {
                // Each file can have nested suites (describe blocks)
                if (file.suites && file.suites.length > 0) {
                  file.suites.forEach((suite: any) => {
                    if (suite.specs) {
                      suite.specs.forEach((spec: any) => {
                        total++
                        if (spec.ok) passed++
                        else failed++
                      })
                    }
                  })
                }
                // Also check for specs directly in the file level
                if (file.specs) {
                  file.specs.forEach((spec: any) => {
                    total++
                    if (spec.ok) passed++
                    else failed++
                  })
                }
              })
            }
          }
        } catch (parseError) {
          console.warn('Could not parse Playwright JSON output:', parseError)
          // Fallback: if exit code is 0, assume 1 test passed
          if (success) {
            total = 1
            passed = 1
            failed = 0
          } else {
            total = 1
            passed = 0
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
