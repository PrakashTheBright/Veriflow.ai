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
    const { testCaseName, testType, testContent, uploadedFileName, selectedFields }: GenerateTestCaseRequest = req.body

    if (!testCaseName || !testContent) {
      return res.status(400).json({ 
        message: 'Test case name and content are required' 
      })
    }

    // Create prompt based on test type and selected fields
    const prompt = createDynamicPrompt(testCaseName, testType, testContent, uploadedFileName, selectedFields)

    console.log('Generating test case with Groq AI...')
    console.log('Selected fields:', selectedFields)
    
    // Call Groq API
    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: testType === 'ui' 
            ? 'You are a Senior QA Automation Architect with expertise in enterprise web applications. Generate structured, comprehensive UI test cases based on feature requirements. Return only valid JSON without any markdown formatting or code blocks. Generate values ONLY for the requested fields.'
            : 'You are an expert QA engineer specializing in API test case design. Generate comprehensive API test cases with proper structure and validation criteria. Return only valid JSON without any markdown formatting or code blocks. Generate values ONLY for the requested fields.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 3000,
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

    // Map the response to proper field keys
    const fieldMapping = testType === 'ui' ? UI_FIELD_KEYS : API_FIELD_KEYS
    const result: Record<string, any> = {}

    // Map each field from the response
    if (selectedFields && selectedFields.length > 0) {
      selectedFields.forEach(fieldLabel => {
        const fieldKey = fieldMapping[fieldLabel]
        if (fieldKey && testCaseData[fieldKey] !== undefined) {
          result[fieldKey] = testCaseData[fieldKey]
        } else if (testCaseData[fieldLabel] !== undefined) {
          result[fieldMapping[fieldLabel] || fieldLabel] = testCaseData[fieldLabel]
        }
      })
    } else {
      // Fallback to full response mapping
      Object.entries(testCaseData).forEach(([key, value]) => {
        result[key] = value
      })
    }

    // Ensure testCaseId is always present
    if (!result.testCaseId) {
      result.testCaseId = `TC_${testType.toUpperCase()}_${Date.now().toString().slice(-6)}`
    }

    console.log('Test case generated successfully:', result.testCaseId)

    res.json({ 
      success: true,
      testCase: result 
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

Generate a structured UI test case based on the provided feature requirements.

INPUT:
Feature Name: ${testCaseName}
Requirement Description: ${testContent}
${uploadedFileName ? `Referenced File: ${uploadedFileName}` : ''}

SELECTED FIELDS TO GENERATE:
${fieldsToGenerate.map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIELD DEFINITIONS:
- testCaseId: Unique identifier (format: TC_UI_XXX)
- moduleName: Module or section of the application
- featureName: Name of the feature being tested
- testCaseTitle: Brief descriptive title of the test
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
- remarks: Additional notes or observations

OUTPUT FORMAT (JSON only, generate ONLY requested fields):
{
    ${fieldDefinitions}
}

RULES:
- Generate ONLY the fields listed above
- Test Case ID format: TC_UI_XXX
- Test steps must be clear, atomic, and automation-friendly
- Expected result should validate specific UI behavior
- Use realistic values based on the requirement
- Do not include any fields not requested
- Return valid JSON only, no markdown`
  } else {
    return `You are an expert API QA Architect.

Generate a comprehensive API test case based on the provided requirements.

INPUT:
API Name: ${testCaseName}
Requirement Description: ${testContent}
${uploadedFileName ? `Referenced File: ${uploadedFileName}` : ''}

SELECTED FIELDS TO GENERATE:
${fieldsToGenerate.map((f, i) => `${i + 1}. ${f}`).join('\n')}

FIELD DEFINITIONS:
- testCaseId: Unique identifier (format: TC_API_XXX)
- apiName: Name of the API being tested
- module: Module or service name
- httpMethod: HTTP method (GET/POST/PUT/DELETE/PATCH)
- endpointUrl: Full API endpoint path
- authorizationType: Auth type (Bearer Token/API Key/OAuth2/None)
- requestHeaders: JSON object of required headers
- requestPayload: Request body as JSON string
- queryParameters: Query params as JSON string
- pathParameters: Path params as JSON string
- preconditions: Prerequisites before API call
- expectedStatusCode: Expected HTTP status code
- expectedResponseBody: Expected response structure
- responseTime: Expected max response time (e.g., "<500ms")
- databaseValidation: Database assertions to verify
- webhookValidation: Webhook validations if applicable
- actualResponse: Leave as "Pending execution"
- status: Leave as "Not Executed"
- remarks: Additional notes

OUTPUT FORMAT (JSON only, generate ONLY requested fields):
{
    ${fieldDefinitions}
}

RULES:
- Generate ONLY the fields listed above
- Test Case ID format: TC_API_XXX
- Use realistic endpoint paths and payloads
- Expected status code must be appropriate for the operation
- Include proper error scenarios consideration
- Return valid JSON only, no markdown`
  }
}

export default router
