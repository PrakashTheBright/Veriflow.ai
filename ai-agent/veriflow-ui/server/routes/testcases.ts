import { Router, Request, Response } from 'express'
import Groq from 'groq-sdk'
import dotenv from 'dotenv'

dotenv.config()

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
  'Module Name': 'moduleName',
  'Feature Name': 'featureName',
  'Test Case Title': 'testCaseTitle',
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
    const hasContent = testContent && testContent.trim().length > 0
    const hasFileContent = uploadedFileContent && uploadedFileContent.trim().length > 0 && !uploadedFileContent.startsWith('[Binary file')
    const hasFileName = uploadedFileName && uploadedFileName.trim().length > 0
    
    console.log('=== Content Analysis ===')
    console.log('testContent length:', testContent?.length || 0)
    console.log('uploadedFileContent length:', uploadedFileContent?.length || 0)
    console.log('hasContent:', hasContent)
    console.log('hasFileContent:', hasFileContent)
    console.log('hasFileName:', hasFileName)
    
    if (!hasContent && !hasFileContent) {
      return res.status(400).json({ 
        message: 'Either test description or uploaded file content is required' 
      })
    }

    // Build content for prompt - combine all available content
    let contentForPrompt = ''
    
    // Add manual description if provided
    if (hasContent && testContent !== uploadedFileContent) {
      contentForPrompt = `User Description:\n${testContent}`
    }
    
    // Add file content if provided and different from testContent
    if (hasFileContent) {
      if (contentForPrompt) {
        contentForPrompt += `\n\n--- Uploaded File Content (${uploadedFileName || 'file'}) ---\n${uploadedFileContent}`
      } else {
        contentForPrompt = `Content from uploaded file (${uploadedFileName || 'file'}):\n${uploadedFileContent}`
      }
    } else if (hasContent && !hasFileContent) {
      // Just use testContent which might already be the file content sent from frontend
      contentForPrompt = testContent
    }
    
    console.log('Final content length for prompt:', contentForPrompt.length)
    console.log('First 200 chars of content:', contentForPrompt.substring(0, 200))

    // Create prompt based on test type and selected fields
    const prompt = createDynamicPrompt(testCaseName, testType, contentForPrompt, uploadedFileName, selectedFields)

    console.log('=== Test Case Generation Request ===')
    console.log('Test Case Name:', testCaseName)
    console.log('Test Type:', testType)
    console.log('Has Direct Content:', hasContent)
    console.log('Has File Content:', hasFileContent)
    console.log('Uploaded File Name:', uploadedFileName || 'None')
    console.log('Content Length:', contentForPrompt.length)
    console.log('Selected Fields:', selectedFields)
    console.log('Content Preview (first 500 chars):', contentForPrompt.substring(0, 500))
    console.log('=====================================')
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: testType === 'ui' 
            ? 'You are a Senior QA Automation Architect with expertise in enterprise web applications. Generate multiple structured, comprehensive UI test cases based on feature requirements. Return only valid JSON without any markdown formatting or code blocks. Generate values ONLY for the requested fields. Include positive, negative, edge cases, and boundary test scenarios for comprehensive coverage.'
            : 'You are an expert QA engineer specializing in API test case design. Generate multiple comprehensive API test cases with proper structure and validation criteria. Return only valid JSON without any markdown formatting or code blocks. Generate values ONLY for the requested fields. Include positive flows, error handling, edge cases, and validation scenarios for comprehensive coverage.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 8000,
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
  selectedFields?: string[]
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

  if (testType === 'ui') {
    return `You are a Senior QA Automation Architect.

CRITICAL: You MUST carefully read and analyze ALL the content provided below.
The content may include user descriptions, uploaded file content (JSON, specs, API docs, etc.).
Extract ALL testable scenarios from this content and generate comprehensive test cases.

Analyze the provided feature requirements and generate a COMPREHENSIVE set of UI test cases.
Dynamically determine the appropriate number of test cases based on:
- Complexity of the feature
- Number of distinct scenarios possible
- Coverage requirements (aim for complete coverage)

Generate test cases to cover ALL of the following (as applicable):
1. Positive/Happy path flows (valid inputs, successful operations)
2. Negative scenarios (invalid inputs, error handling)
3. Edge cases (boundary values, empty states, special characters)
4. Validation tests (field validations, format checks)
5. UI state variations (loading, disabled, read-only states)
6. User permission scenarios (if applicable)

=== CONTENT TO ANALYZE (READ CAREFULLY) ===
Feature/Test Case Name: ${testCaseName}
${uploadedFileName ? `Source File: ${uploadedFileName}\n` : ''}
--- BEGIN CONTENT ---
${testContent}
--- END CONTENT ---
===========================================

Generate test cases based on the ENTIRE content above.

SELECTED FIELDS TO GENERATE FOR EACH TEST CASE:
${fieldsToGenerate.map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIELD DEFINITIONS:
- testCaseId: Unique identifier (format: TC_UI_XXX, incrementing: TC_UI_001, TC_UI_002, etc.)
- moduleName: Module or section of the application
- featureName: Name of the feature being tested
- testCaseTitle: Brief descriptive title of the test (should clearly indicate what is being tested)
- requirementId: Associated requirement or story ID
- priority: Test priority (High/Medium/Low)
- severity: Defect severity if test fails (Critical/Major/Minor)
- testType: Type of test (Functional/Regression/Smoke)
- preconditions: Prerequisites before test execution
- testData: Required test data inputs
- testSteps: Array of sequential test steps
- expectedResult: Expected outcome after test execution
- actualResult: Leave as "Pending execution"
- status: Leave as "Not Executed"
- environment: Target environment (e.g., QA/Staging/Production)
- buildVersion: Leave as "TBD"
- executedBy: Leave as "Not assigned"
- executionDate: Leave as "Not executed"
- remarks: Additional notes - include scenario type (Positive/Negative/Edge Case/Validation)

OUTPUT FORMAT (JSON array - generate as many test cases as needed for comprehensive coverage):
{
  "testCases": [
    {
        ${fieldDefinitions}
    }
  ]
}

RULES:
- Generate the APPROPRIATE number of test cases for comprehensive coverage (typically 5-15 depending on complexity)
- Each test case must have a unique testCaseId (TC_UI_001, TC_UI_002, etc.)
- Each test case should test ONE specific scenario
- Test steps must be clear, atomic, and automation-friendly
- Include a GOOD MIX of positive, negative, and edge cases
- Use realistic values based on the requirement
- Return valid JSON only, no markdown`
  } else {
    return `You are an expert API QA Architect.

CRITICAL: You MUST carefully read and analyze ALL the content provided below.
The content may include API specifications, Swagger/OpenAPI docs, requirements documents, or JSON payloads.
Extract ALL testable API scenarios from this content and generate comprehensive test cases.

Analyze the provided API requirements and generate a COMPREHENSIVE set of API test cases.
Dynamically determine the appropriate number of test cases based on:
- API complexity and number of parameters
- Possible response scenarios
- Coverage requirements (aim for complete coverage)

Generate test cases to cover ALL of the following (as applicable):
1. Success flows (200, 201, 204 responses)
2. Validation errors (400 - missing/invalid fields)
3. Authentication failures (401 - unauthorized)
4. Authorization failures (403 - forbidden)
5. Resource not found (404)
6. Conflict scenarios (409)
7. Server errors (500 - internal server error)
8. Edge cases (empty arrays, null values, special characters, max lengths)
9. Security scenarios (injection attempts, XSS, unauthorized access)

=== CONTENT TO ANALYZE (READ CAREFULLY) ===
API/Test Case Name: ${testCaseName}
${uploadedFileName ? `Source File: ${uploadedFileName}\n` : ''}
--- BEGIN CONTENT ---
${testContent}
--- END CONTENT ---
===========================================

Generate test cases based on the ENTIRE content above. If the content includes API definitions, endpoints, or request/response examples, use them to create specific test cases.

SELECTED FIELDS TO GENERATE FOR EACH TEST CASE:
${fieldsToGenerate.map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIELD DEFINITIONS:
- testCaseId: Unique identifier (format: TC_API_XXX, incrementing: TC_API_001, TC_API_002, etc.)
- apiName: Name of the API being tested
- module: Module or service name
- httpMethod: HTTP method (GET/POST/PUT/DELETE/PATCH)
- endpointUrl: Full API endpoint path
- authorizationType: Auth type (Bearer Token/API Key/OAuth2/None)
- requestHeaders: JSON object of required headers (compact format)
- requestPayload: Request body as JSON (compact format)
- queryParameters: Query params as JSON string
- pathParameters: Path params as JSON string
- preconditions: Prerequisites before API call
- expectedStatusCode: Expected HTTP status code (200, 400, 401, 404, 500, etc.)
- expectedResponseBody: Expected response structure (compact format)
- responseTime: Expected max response time (e.g., "<500ms")
- databaseValidation: Database assertions to verify
- webhookValidation: Webhook validations if applicable
- actualResponse: Leave as "Pending execution"
- status: Leave as "Not Executed"
- remarks: Scenario type (Success/Validation Error/Auth Error/Edge Case/Security)

OUTPUT FORMAT (JSON array - generate as many test cases as needed for comprehensive coverage):
{
  "testCases": [
    {
        ${fieldDefinitions}
    }
  ]
}

RULES:
- Generate the APPROPRIATE number of test cases for comprehensive API coverage (typically 8-20 depending on complexity)
- Each test case must have a unique testCaseId (TC_API_001, TC_API_002, etc.)
- Each test case should test ONE specific scenario
- Include realistic request payloads and expected responses
- Expected status code must be appropriate for each scenario
- Cover BOTH success and failure scenarios thoroughly
- Return valid JSON only, no markdown`
  }
}

export default router
