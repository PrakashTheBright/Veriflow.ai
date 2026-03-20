import { Router, Request, Response } from 'express'
import Groq from 'groq-sdk'
import multer from 'multer'
import dotenv from 'dotenv'

// Dynamically require pdf-parse and mammoth.
// pdf-parse v1.x: require('pdf-parse') → function(buffer) → Promise<{text}>
let pdfParse: ((buf: Buffer, opts?: any) => Promise<{ text: string }>) | null = null
let mammoth: { extractRawText: (opts: { buffer: Buffer }) => Promise<{ value: string }> } | null = null
try { pdfParse = require('pdf-parse') } catch (e) {
  console.warn('[pdf-parse] not available:', e)
}
try { mammoth = require('mammoth') } catch (e) {
  console.warn('[mammoth] not available:', e)
}

dotenv.config()

// Multer: store files in memory so we don't touch the filesystem
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
})

const router = Router()

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

interface GenerateTestCaseRequest {
  testCaseName: string
  testType: 'ui' | 'api'
  testContent: string
  uploadedFileName?: string
  uploadedFileContent?: string
  selectedFields?: string[]
}

// Field key to label mapping for UI tests
const UI_FIELD_KEYS: Record<string, string> = {
  'Test Case ID': 'testCaseId',
  'Test Case Title / Name': 'testCaseTitle',
  'Test Case Title': 'testCaseTitle',
  'Module': 'moduleName',
  'Module Name': 'moduleName',
  'Feature Name': 'featureName',
  'Requirement ID': 'requirementId',
  'Priority': 'priority',
  'Severity': 'severity',
  'Test Type': 'testType',
  'Preconditions': 'preconditions',
  'Test Data': 'testData',
  'Test Steps': 'testSteps',
  'Expected Result': 'expectedResult',
  'Actual Result': 'actualResult',
  'Status': 'status',
  'Environment': 'environment',
  'Build Version': 'buildVersion',
  'Executed By': 'executedBy',
  'Execution Date': 'executionDate',
  'Remarks': 'remarks',
}

// Field key to label mapping for API tests
const API_FIELD_KEYS: Record<string, string> = {
  'Test Case ID': 'testCaseId',
  'API Name': 'apiName',
  'Module': 'module',
  'HTTP Method': 'httpMethod',
  'Endpoint URL': 'endpointUrl',
  'Authorization Type': 'authorizationType',
  'Request Headers': 'requestHeaders',
  'Request Payload': 'requestPayload',
  'Query Parameters': 'queryParameters',
  'Path Parameters': 'pathParameters',
  'Preconditions': 'preconditions',
  'Expected Status Code': 'expectedStatusCode',
  'Expected Response Body': 'expectedResponseBody',
  'Response Time': 'responseTime',
  'Database Validation': 'databaseValidation',
  'Webhook Validation': 'webhookValidation',
  'Actual Response': 'actualResponse',
  'Status': 'status',
  'Remarks': 'remarks',
}

// ── Parse uploaded file and return extracted text ────────────────────────────
// POST /api/testcases/parse-file  (multipart/form-data, field name: "file")
router.post('/parse-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = (req as any).file as Express.Multer.File | undefined
    if (!file) {
      return res.status(400).json({ message: 'No file provided' })
    }

    const name = file.originalname.toLowerCase()
    const ext = name.split('.').pop() || ''
    let extractedText = ''

    // ── PDF ──────────────────────────────────────────────────────────────────
    if (ext === 'pdf') {
      if (!pdfParse) {
        return res.status(500).json({ message: 'PDF parsing library not available on server' })
      }
      const result = await pdfParse(file.buffer)
      extractedText = result.text || ''
    }
    // ── DOCX / DOC ───────────────────────────────────────────────────────────
    else if (ext === 'docx' || ext === 'doc') {
      if (!mammoth) {
        return res.status(500).json({ message: 'DOCX parsing library not available on server' })
      }
      const result = await mammoth.extractRawText({ buffer: file.buffer })
      extractedText = result.value || ''
    }
    // ── Plain text / JSON / Markdown / CSV / YAML ────────────────────────────
    else if (['txt', 'md', 'json', 'csv', 'yaml', 'yml', 'js', 'ts', 'jsx', 'tsx', 'xml', 'html', 'sql'].includes(ext)) {
      extractedText = file.buffer.toString('utf-8')
    }
    // ── Images – we can't extract text, return informative notice ────────────
    else if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext)) {
      return res.json({
        success: true,
        extractedText: '',
        isBinary: true,
        message: `Image files cannot have text extracted automatically. Please describe the UI scenario in the Test Description field.`
      })
    } else {
      // Unknown binary – attempt UTF-8, strip non-printable characters
      extractedText = file.buffer.toString('utf-8').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    }

    // Trim to 15000 chars to stay within Groq token limits
    const truncated = extractedText.length > 15000
      ? extractedText.substring(0, 15000) + '\n\n... (content truncated for processing)'
      : extractedText

    console.log(`[parse-file] ${file.originalname} → ${truncated.length} chars extracted`)

    return res.json({
      success: true,
      extractedText: truncated,
      isBinary: false,
      originalName: file.originalname
    })
  } catch (err: any) {
    console.error('[parse-file] error:', err)
    return res.status(500).json({ message: 'Unable to read uploaded file', error: err.message })
  }
})

// ── Generate test case using Groq AI ──────────────────────────────────────────
// Generate test case using Groq AI
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { testCaseName, testType, testContent, uploadedFileName, uploadedFileContent, selectedFields }: GenerateTestCaseRequest = req.body

    if (!testCaseName) {
      return res.status(400).json({ 
        message: 'Test case name is required' 
      })
    }
    
    // Check if either description or file is provided
    const hasContent = !!(testContent && testContent.trim().length > 0)
    // Reject placeholder strings set by the frontend for unreadable binary files
    const isPlaceholder = (s: string) =>
      s.startsWith('[Binary file') ||
      s.startsWith('[PDF file uploaded') ||
      s.startsWith('[DOCX file uploaded') ||
      s.startsWith('[DOC file uploaded') ||
      s.startsWith('[Image file uploaded') ||
      s.startsWith('[image file')
    const hasFileContent = !!(uploadedFileContent &&
      uploadedFileContent.trim().length > 0 &&
      !isPlaceholder(uploadedFileContent.trim()))
    const hasFileName = !!(uploadedFileName && uploadedFileName.trim().length > 0)
    
    console.log('=== Content Analysis ===')
    console.log('testContent length:', testContent?.length || 0)
    console.log('uploadedFileContent length:', uploadedFileContent?.length || 0)
    console.log('hasContent:', hasContent)
    console.log('hasFileContent:', hasFileContent)
    console.log('hasFileName:', hasFileName)
    
    if (!hasContent && !hasFileContent && !hasFileName) {
      return res.status(400).json({ 
        message: 'Either test description or uploaded file content is required' 
      })
    }

    // Build content for prompt.
    // Priority rule: File content > Description (when both provided).
    // Pass raw extracted text — no extra wrapping prefix — so Groq reads the
    // actual document content without noise.
    let rawContent = ''
    let contentSource = ''

    if (hasFileContent) {
      rawContent = uploadedFileContent!.trim()
      contentSource = uploadedFileName ? `Uploaded file: ${uploadedFileName}` : 'Uploaded file'
      if (hasContent) {
        rawContent += `\n\n--- Additional context from user ---\n${testContent.trim()}`
      }
    } else if (hasContent) {
      rawContent = testContent.trim()
      contentSource = 'User description'
    } else {
      // File uploaded but content could not be extracted
      rawContent = `Test case name: ${testCaseName}\nFile: ${uploadedFileName}\nNo extractable text content.`
      contentSource = uploadedFileName ? `Uploaded file (no text): ${uploadedFileName}` : 'No content'
    }
    
    console.log('=== Test Case Generation Request ===')
    console.log('Test Case Name:', testCaseName)
    console.log('Test Type:', testType)
    console.log('Content source:', contentSource)
    console.log('Raw content length:', rawContent.length)
    console.log('Selected Fields:', selectedFields)
    console.log('Content preview (first 500 chars):', rawContent.substring(0, 500))
    console.log('=====================================')

    // ── STEP 1: Deep document analysis ───────────────────────────────────────
    console.log('[Step 1] Analysing document with Groq...')

    const analysisSystemPrompt = testType === 'ui'
      ? `You are a Senior Business Analyst and QA expert. Your job is to read a provided document (requirement spec, user story, design doc, etc.) and extract a structured analysis of everything testable in it.
Return ONLY valid JSON. Do not add any markdown or explanation outside the JSON.`
      : `You are a Senior API Architect and QA expert. Your job is to read a provided API specification, Swagger doc, or requirements document and extract a structured analysis of every testable API scenario in it.
Return ONLY valid JSON. Do not add any markdown or explanation outside the JSON.`

    const analysisUserPrompt = testType === 'ui'
      ? `Read the following document carefully and extract a DEEP structured analysis for QA purposes.

Test Case Name: ${testCaseName}
Source: ${contentSource}

=== BEGIN DOCUMENT CONTENT ===
${rawContent}
=== END DOCUMENT CONTENT ===

Your goal is to identify EVERY possible testable scenario. Be extremely thorough:
1. Identify all features and pages.
2. For every user flow, identify positive paths, alternative paths, and what happens if a step is skipped or done out of order.
3. For every form field, identify:
   - Positive validation (valid data types, lengths)
   - Negative validation (missing required fields, invalid formats, length violations)
   - Boundary values (min, max, just below min, just above max)
   - Edge cases (special characters, SQL injection characters, extremely long strings)
4. Identify all business rules and their corresponding success and failure conditions.
5. Identify all error conditions mentioned or implied.

Return a JSON object with this exact structure:
{
  "summary": "One paragraph summary of what this document describes",
  "module": "Module or application area name",
  "features": ["List of distinct features or pages"],
  "userFlows": [
    { "flow": "Flow name", "steps": ["step 1", "step 2", ...], "preconditions": "any preconditions", "variations": ["positive", "negative", "edge case variants"] }
  ],
  "formFields": [
    { "field": "Exact name", "type": "text/dropdown/etc", "required": true, "validations": ["rules"], "testScenarios": ["list of positive, negative, and boundary scenarios for THIS field"] }
  ],
  "businessRules": ["Rules and their constraints"],
  "roles": ["User roles/permissions"],
  "testableScenarios": [
    { "scenario": "Specific scenario description", "type": "positive/negative/edge/validation/boundary", "priority": "high/medium/low", "details": "what exactly to test" }
  ]
}`
      : `Read the following API document carefully and extract a DEEP structured analysis for QA purposes.

Test Case Name: ${testCaseName}
Source: ${contentSource}

=== BEGIN DOCUMENT CONTENT ===
${rawContent}
=== END DOCUMENT CONTENT ===

Your goal is to identify EVERY possible testable scenario for the APIs. Be extremely thorough:
1. Use EXACT endpoint paths, methods, and field names.
2. For every endpoint, identify:
   - Successful execution scenarios (2xx).
   - Validation failure scenarios (400) for every single input field (missing, wrong type, out of range).
   - Authentication and Authorization failure scenarios (401, 403).
   - Resource not found scenarios (404).
   - Conflict or state-based errors (409, etc.).
   - Edge cases (very large payloads, empty payloads, special characters in params).
3. Identify all business rules and their success/failure conditions.

Return a JSON object with this exact structure:
{
  "summary": "One paragraph summary",
  "baseUrl": "Base URL",
  "authType": "Authentication type",
  "endpoints": [
    {
      "method": "...",
      "path": "...",
      "name": "...",
      "description": "...",
      "requestHeaders": { "Header-Name": "value" },
      "requestBody": { "field": "type/description" },
      "queryParams": ["..."],
      "pathParams": ["..."],
      "successResponse": { "statusCode": 200, "body": {} },
      "errorResponses": [{ "statusCode": 400, "description": "exact reason" }],
      "testScenarios": ["List of specific positive and negative scenarios for this endpoint"]
    }
  ],
  "businessRules": ["Rules"],
  "testableScenarios": [
    { "endpointPath": "...", "method": "...", "scenario": "Specific description", "type": "success/validation/auth/notfound/edge/boundary", "expectedStatus": 200 }
  ]
}`

    const analysisCompletion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: analysisSystemPrompt },
        { role: 'user', content: analysisUserPrompt }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 8000,
      response_format: { type: 'json_object' }
    })

    const analysisRaw = analysisCompletion.choices[0]?.message?.content
    if (!analysisRaw) throw new Error('No analysis response from Groq AI')

    let documentAnalysis: any
    try {
      documentAnalysis = JSON.parse(analysisRaw)
    } catch {
      throw new Error('Failed to parse document analysis from Groq AI')
    }

    console.log('[Step 1] Document analysis complete.')
    console.log('Summary:', documentAnalysis.summary)
    console.log('Testable scenarios found:', documentAnalysis.testableScenarios?.length || 0)

    // ── STEP 2: Test Case Generation from Analysis ────────────────────────────
    console.log('[Step 2] Generating test cases from analysis...')

    const prompt = createDynamicPrompt(testCaseName, testType, rawContent, uploadedFileName, selectedFields, documentAnalysis)
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: testType === 'ui'
            ? 'You are a Senior QA Automation Architect. You will receive a structured document analysis. Your task is to generate a COMPREHENSIVE set of UI test cases that covers EVERY scenario, variation, field, and business rule identified in the analysis. For every form field, ensure there are both successful input tests and validation failure tests. Ensure maximum possible coverage for all user flows. Return only valid JSON, no markdown.'
            : 'You are an expert API QA Architect. You will receive a structured document analysis. Your task is to generate a COMPREHENSIVE set of API test cases that covers EVERY endpoint, scenario, type (success, validation, auth, etc.), and edge case identified in the analysis. Use exact paths and methods. For every input field, ensure there are tests for valid and invalid data. Return only valid JSON, no markdown.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.3,
      max_tokens: 16000,
      response_format: { type: 'json_object' }
    })

    const generatedContent = completion.choices[0]?.message?.content

    if (!generatedContent) {
      throw new Error('No response from Groq AI')
    }

    // Parse the AI response
    let testCaseData
    try {
      testCaseData = JSON.parse(generatedContent)
    } catch (parseError) {
      console.error('Failed to parse AI response:', generatedContent)
      throw new Error('Invalid AI response format')
    }

    // Handle both single test case and multiple test cases response formats
    let testCasesArray: any[] = []
    
    if (Array.isArray(testCaseData)) {
      testCasesArray = testCaseData
    } else if (testCaseData.testCases && Array.isArray(testCaseData.testCases)) {
      testCasesArray = testCaseData.testCases
    } else if (testCaseData.test_cases && Array.isArray(testCaseData.test_cases)) {
      testCasesArray = testCaseData.test_cases
    } else {
      // Single test case - wrap in array
      testCasesArray = [testCaseData]
    }

    // Map the response to proper field keys
    const fieldMapping = testType === 'ui' ? UI_FIELD_KEYS : API_FIELD_KEYS
    const results: Record<string, any>[] = []

    testCasesArray.forEach((tc, index) => {
      const result: Record<string, any> = {}

      // Map each field from the response
      if (selectedFields && selectedFields.length > 0) {
        selectedFields.forEach(fieldLabel => {
          const fieldKey = fieldMapping[fieldLabel]
          if (fieldKey && tc[fieldKey] !== undefined) {
            result[fieldKey] = tc[fieldKey]
          } else if (tc[fieldLabel] !== undefined) {
            result[fieldMapping[fieldLabel] || fieldLabel] = tc[fieldLabel]
          }
        })
      } else {
        // Fallback to full response mapping
        Object.entries(tc).forEach(([key, value]) => {
          result[key] = value
        })
      }

      // Ensure testCaseId is always present and unique
      if (!result.testCaseId) {
        result.testCaseId = `TC_${testType.toUpperCase()}_${Date.now().toString().slice(-6)}_${index + 1}`
      }

      results.push(result)
    })

    console.log(`Generated ${results.length} test cases successfully`)

    res.json({ 
      success: true,
      testCases: results,
      testCase: results[0] // Keep backward compatibility
    })

  } catch (error: any) {
    console.error('Error generating test case:', error)
    res.status(500).json({ 
      message: 'Failed to generate test case',
      error: error.message 
    })
  }
})

function createDynamicPrompt(
  testCaseName: string, 
  testType: 'ui' | 'api', 
  testContent: string, 
  uploadedFileName?: string,
  selectedFields?: string[],
  documentAnalysis?: any
): string {
  const fieldsToGenerate = selectedFields && selectedFields.length > 0 
    ? selectedFields 
    : testType === 'ui' 
      ? Object.keys(UI_FIELD_KEYS)
      : Object.keys(API_FIELD_KEYS)

  const fieldMapping = testType === 'ui' ? UI_FIELD_KEYS : API_FIELD_KEYS
  
  // Create field definitions for the prompt
  const fieldDefinitions = fieldsToGenerate.map(label => {
    const key = fieldMapping[label]
    if (label === 'Test Steps') {
      return `"${key}": ["Step 1 description", "Step 2 description", ...]`
    }
    return `"${key}": "value for ${label}"`
  }).join(',\n    ')

  // Serialize the structured document analysis for Step 2.
  // We keep the analysis JSON compact and also include a condensed version of
  // the original content so the model can cross-reference if needed.
  const analysisJSON = JSON.stringify(documentAnalysis)
  const originalSnippet = testContent.length > 2000
    ? testContent.substring(0, 2000) + '\n...(truncated)'
    : testContent

  const analysisBlock = `=== DOCUMENT ANALYSIS (Step 1 output) ===
${analysisJSON}
==========================================

=== ORIGINAL CONTENT SNIPPET (for reference) ===
${uploadedFileName ? `File: ${uploadedFileName}\n` : ''}${originalSnippet}
================================================`

  if (testType === 'ui') {
    return `You are a Senior QA Automation Architect.

The document analysis below was produced by a previous AI step that carefully read the original document and extracted all testable requirements, features, fields, flows, and business rules.

Your task: Generate a COMPREHENSIVE set of UI test cases based on the analysis below.
- Maximum Coverage: Ensure every feature, user flow, form field, and business rule in the analysis is covered.
- Diverse Scenarios: For each identified item, generate multiple test cases covering positive paths, negative paths (invalid input, mandatory fields), and edge cases (boundary values, special characters).
- Specificity: Use exact field names and flow steps from the analysis.
- Volume: Generate as many distinct test cases as needed to achieve deep coverage (typically 5-15 test cases for a standard feature).

${analysisBlock}

FIELDS TO POPULATE FOR EACH TEST CASE:
${fieldsToGenerate.map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIELD DEFINITIONS:
- testCaseId: Unique identifier (TC_UI_001, TC_UI_002, ...)
- moduleName: From analysis.module
- featureName: From analysis.features
- testCaseTitle: Specific title describing the scenario (e.g., "Login - Valid Credentials", "Login - Invalid Email Format")
- requirementId: From analysis if available, else blank
- priority: High/Medium/Low
- severity: Critical/Major/Minor
- testType: Functional/Regression/Smoke
- preconditions: From analysis.userFlows[].preconditions or analysis.businessRules
- testData: Concrete values for the scenario (e.g., "test@example.com", "Long_String_123!")
- testSteps: Array of atomic steps
- expectedResult: Exact outcome for the specific scenario
- actualResult: "Pending execution"
- status: "Not Executed"
- environment: "QA"
- buildVersion: "TBD"
- executedBy: "Not assigned"
- executionDate: "Not executed"
- remarks: Scenario type (Positive/Negative/Edge Case/Validation/Boundary)

OUTPUT FORMAT:
{
  "testCases": [
    {
        ${fieldDefinitions}
    }
  ]
}

Return valid JSON only, no markdown.`
  } else {
    return `You are an expert API QA Architect.

The document analysis below was produced by a previous AI step that carefully read the original API specification and extracted all endpoints, fields, request/response structures, auth requirements, and testable scenarios.

Your task: Generate a COMPREHENSIVE set of API test cases based on the analysis below.
- Maximum Coverage: Every endpoint and method in the analysis must have multiple test cases.
- Comprehensive Testing: For each endpoint, generate test cases for:
  - Success (2xx)
  - Validation failures (400) for EACH input field (missing, wrong type, invalid format)
  - Auth failures (401, 403)
  - Not Found (404)
  - Edge cases (large payloads, empty params, special characters)
- Specificity: Use EXACT endpoint paths and field names from the analysis.
- Volume: Generate as many distinct test cases as needed to achieve deep coverage (typically 5-10 test cases per endpoint).

${analysisBlock}

FIELDS TO POPULATE FOR EACH TEST CASE:
${fieldsToGenerate.map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIELD DEFINITIONS:
- testCaseId: Unique identifier (TC_API_001, TC_API_002, ...)
- apiName: Endpoint name from analysis.endpoints[].name
- module: From analysis
- httpMethod: Exact method
- endpointUrl: Exact path
- authorizationType: From analysis
- requestHeaders: Headers from analysis
- requestPayload: Complete JSON payload for the scenario
- queryParameters: Object with param names and test values
- pathParameters: Object with param names and test values
- preconditions: Prerequisites
- expectedStatusCode: The status code expected for this specific scenario
- expectedResponseBody: Expected response structure or error message
- responseTime: "<500ms"
- databaseValidation: DB assertions if applicable
- webhookValidation: Webhook assertions if applicable
- actualResponse: "Pending execution"
- status: "Not Executed"
- remarks: Scenario type (Success/Validation Error/Auth Error/Not Found/Edge Case/Boundary Value)

OUTPUT FORMAT:
{
  "testCases": [
    {
        ${fieldDefinitions}
    }
  ]
}

Return valid JSON only, no markdown.`
  }
}

export default router
