import { useState, useEffect } from 'react'
import { FileText, Code, Sparkles, Download, Upload, CheckCircle2, ClipboardList, X, Check, Square, CheckSquare, LayoutTemplate } from 'lucide-react'
import toast from 'react-hot-toast'

// Template field configurations
const UI_TEST_TEMPLATE_FIELDS = [
  { key: 'testCaseId', label: 'Test Case ID', required: true },
  { key: 'moduleName', label: 'Module Name', required: false },
  { key: 'featureName', label: 'Feature Name', required: false },
  { key: 'testCaseTitle', label: 'Test Case Title', required: true },
  { key: 'requirementId', label: 'Requirement ID', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'severity', label: 'Severity', required: false },
  { key: 'testType', label: 'Test Type', required: false },
  { key: 'preconditions', label: 'Preconditions', required: false },
  { key: 'testData', label: 'Test Data', required: false },
  { key: 'testSteps', label: 'Test Steps', required: true },
  { key: 'expectedResult', label: 'Expected Result', required: true },
  { key: 'actualResult', label: 'Actual Result', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'environment', label: 'Environment', required: false },
  { key: 'buildVersion', label: 'Build Version', required: false },
  { key: 'executedBy', label: 'Executed By', required: false },
  { key: 'executionDate', label: 'Execution Date', required: false },
  { key: 'remarks', label: 'Remarks', required: false },
]

const API_TEST_TEMPLATE_FIELDS = [
  { key: 'testCaseId', label: 'Test Case ID', required: true },
  { key: 'apiName', label: 'API Name', required: true },
  { key: 'module', label: 'Module', required: false },
  { key: 'httpMethod', label: 'HTTP Method', required: true },
  { key: 'endpointUrl', label: 'Endpoint URL', required: true },
  { key: 'authorizationType', label: 'Authorization Type', required: false },
  { key: 'requestHeaders', label: 'Request Headers', required: false },
  { key: 'requestPayload', label: 'Request Payload', required: false },
  { key: 'queryParameters', label: 'Query Parameters', required: false },
  { key: 'pathParameters', label: 'Path Parameters', required: false },
  { key: 'preconditions', label: 'Preconditions', required: false },
  { key: 'expectedStatusCode', label: 'Expected Status Code', required: true },
  { key: 'expectedResponseBody', label: 'Expected Response Body', required: false },
  { key: 'responseTime', label: 'Response Time', required: false },
  { key: 'databaseValidation', label: 'Database Validation', required: false },
  { key: 'webhookValidation', label: 'Webhook Validation', required: false },
  { key: 'actualResponse', label: 'Actual Response', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'remarks', label: 'Remarks', required: false },
]

interface GeneratedTestCaseData {
  [key: string]: string | string[] | undefined
}

export default function CreateTestCasesPage() {
  const [testType, setTestType] = useState<'ui' | 'api'>('ui')
  const [testCaseName, setTestCaseName] = useState('')
  const [testContent, setTestContent] = useState('')
  const [uploadedFile, setUploadedFile] = useState<File | null>(null)
  const [generatedTestCase, setGeneratedTestCase] = useState<GeneratedTestCaseData | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'md' | 'json' | 'csv'>('csv')
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())

  // Get current template fields based on test type
  const currentTemplateFields = testType === 'ui' ? UI_TEST_TEMPLATE_FIELDS : API_TEST_TEMPLATE_FIELDS

  // Initialize selected fields with required fields when test type changes
  useEffect(() => {
    const requiredFields = currentTemplateFields
      .filter(field => field.required)
      .map(field => field.key)
    setSelectedFields(new Set(requiredFields))
    setGeneratedTestCase(null)
  }, [testType])

  const handleFieldToggle = (fieldKey: string) => {
    const field = currentTemplateFields.find(f => f.key === fieldKey)
    if (field?.required) return // Cannot deselect required fields
    
    const newSelected = new Set(selectedFields)
    if (newSelected.has(fieldKey)) {
      newSelected.delete(fieldKey)
    } else {
      newSelected.add(fieldKey)
    }
    setSelectedFields(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedFields(new Set(currentTemplateFields.map(f => f.key)))
  }

  const handleDeselectOptional = () => {
    const requiredFields = currentTemplateFields
      .filter(field => field.required)
      .map(field => field.key)
    setSelectedFields(new Set(requiredFields))
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadedFile(file)
      toast.success(`File "${file.name}" uploaded successfully`)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
  }

  const handleGenerate = async () => {
    if (!testCaseName.trim()) {
      toast.error('Please enter a test case name')
      return
    }
    if (!testContent.trim() && !uploadedFile) {
      toast.error('Please enter Test Description or upload a file')
      return
    }
    if (selectedFields.size === 0) {
      toast.error('Please select at least one template field')
      return
    }

    setIsGenerating(true)
    try {
      const selectedFieldLabels = currentTemplateFields
        .filter(f => selectedFields.has(f.key))
        .map(f => f.label)

      const response = await fetch('http://localhost:4000/api/testcases/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          testCaseName, 
          testType, 
          testContent, 
          uploadedFileName: uploadedFile?.name,
          selectedFields: selectedFieldLabels
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to generate test case')
      }

      const data = await response.json()
      if (!data.success || !data.testCase) throw new Error('Invalid response from server')

      // Map the response to selected fields only
      const filteredTestCase: GeneratedTestCaseData = {}
      currentTemplateFields.forEach(field => {
        if (selectedFields.has(field.key)) {
          filteredTestCase[field.key] = data.testCase[field.key] || data.testCase[field.label] || '-'
        }
      })
      
      setGeneratedTestCase(filteredTestCase)
      toast.success('Test case generated successfully!')
    } catch (error: any) {
      console.error('Error generating test case:', error)
      toast.error(error.message || 'Failed to generate test case')
    } finally {
      setIsGenerating(false)
    }
  }

  const convertToCSV = (): string => {
    if (!generatedTestCase) return ''
    
    const selectedFieldsList = currentTemplateFields.filter(f => selectedFields.has(f.key))
    const headers = selectedFieldsList.map(f => f.label)
    const escapeCSV = (val: string | string[] | undefined) => {
      if (!val) return '""'
      const str = Array.isArray(val) ? val.map((s, i) => `${i + 1}. ${s}`).join('\n') : String(val)
      return `"${str.replace(/"/g, '""')}"`
    }
    const values = selectedFieldsList.map(f => escapeCSV(generatedTestCase[f.key]))
    return [headers.join(','), values.join(',')].join('\n')
  }

  const convertToJSON = (): string => {
    if (!generatedTestCase) return '{}'
    const selectedFieldsList = currentTemplateFields.filter(f => selectedFields.has(f.key))
    const output: { [key: string]: string | string[] | undefined } = {}
    selectedFieldsList.forEach(f => {
      output[f.label] = generatedTestCase[f.key]
    })
    return JSON.stringify(output, null, 2)
  }

  const convertToMarkdown = (): string => {
    if (!generatedTestCase) return ''
    const selectedFieldsList = currentTemplateFields.filter(f => selectedFields.has(f.key))
    let md = `# Test Case: ${generatedTestCase.testCaseId || generatedTestCase.testCaseTitle || testCaseName}\n\n`
    selectedFieldsList.forEach(f => {
      const val = generatedTestCase[f.key]
      if (Array.isArray(val)) {
        md += `## ${f.label}\n${val.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
      } else {
        md += `**${f.label}:** ${val || '-'}\n\n`
      }
    })
    return md
  }

  const handleDownload = () => {
    if (!generatedTestCase) {
      toast.error('No test case to download')
      return
    }

    let content: string, fileName: string, mimeType: string
    const baseName = testCaseName.toLowerCase().replace(/\s+/g, '-')

    switch (downloadFormat) {
      case 'csv':
        content = convertToCSV()
        fileName = `${baseName}.csv`
        mimeType = 'text/csv'
        break
      case 'json':
        content = convertToJSON()
        fileName = `${baseName}.json`
        mimeType = 'application/json'
        break
      case 'md':
      default:
        content = convertToMarkdown()
        fileName = `${baseName}.md`
        mimeType = 'text/markdown'
        break
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    toast.success(`Downloaded ${fileName}`)
  }

  const renderFieldValue = (fieldKey: string, value: string | string[] | undefined) => {
    if (!value || value === '-') return <span className="text-gray-500 italic">Not specified</span>
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1">
          {value.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center text-purple-400 text-xs font-medium">
                {idx + 1}
              </span>
              <span className="text-gray-300 text-sm">{step}</span>
            </div>
          ))}
        </div>
      )
    }
    return <span className="text-gray-300">{value}</span>
  }

  const renderTableCellValue = (fieldKey: string, value: string | string[] | undefined) => {
    if (!value || value === '-') {
      return <span className="text-gray-500 italic text-sm">-</span>
    }
    
    if (Array.isArray(value)) {
      return (
        <div className="space-y-1.5">
          {value.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className="text-gray-200 text-sm leading-snug">{step}</span>
            </div>
          ))}
        </div>
      )
    }

    // Handle long text values
    const stringValue = String(value)
    if (stringValue.length > 100) {
      return (
        <div className="text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
          {stringValue}
        </div>
      )
    }

    // Handle status field with badge
    if (fieldKey === 'status') {
      const statusColors: Record<string, string> = {
        'Not Executed': 'bg-gray-600/50 text-gray-300 border-gray-500',
        'Pass': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        'Fail': 'bg-red-500/20 text-red-400 border-red-500/50',
        'Blocked': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
      }
      const colorClass = statusColors[stringValue] || statusColors['Not Executed']
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
          {stringValue}
        </span>
      )
    }

    // Handle priority/severity with badges
    if (fieldKey === 'priority' || fieldKey === 'severity') {
      const priorityColors: Record<string, string> = {
        'High': 'bg-red-500/20 text-red-400 border-red-500/50',
        'Critical': 'bg-red-500/20 text-red-400 border-red-500/50',
        'Medium': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        'Major': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        'Low': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        'Minor': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
      }
      const colorClass = priorityColors[stringValue] || 'bg-gray-600/50 text-gray-300 border-gray-500'
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass}`}>
          {stringValue}
        </span>
      )
    }

    // Handle HTTP method with badge
    if (fieldKey === 'httpMethod') {
      const methodColors: Record<string, string> = {
        'GET': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
        'POST': 'bg-blue-500/20 text-blue-400 border-blue-500/50',
        'PUT': 'bg-amber-500/20 text-amber-400 border-amber-500/50',
        'PATCH': 'bg-orange-500/20 text-orange-400 border-orange-500/50',
        'DELETE': 'bg-red-500/20 text-red-400 border-red-500/50',
      }
      const colorClass = methodColors[stringValue.toUpperCase()] || 'bg-gray-600/50 text-gray-300 border-gray-500'
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${colorClass}`}>
          {stringValue.toUpperCase()}
        </span>
      )
    }

    // Handle expected status code
    if (fieldKey === 'expectedStatusCode') {
      const code = parseInt(stringValue)
      let colorClass = 'bg-gray-600/50 text-gray-300'
      if (code >= 200 && code < 300) colorClass = 'bg-emerald-500/20 text-emerald-400'
      else if (code >= 400 && code < 500) colorClass = 'bg-amber-500/20 text-amber-400'
      else if (code >= 500) colorClass = 'bg-red-500/20 text-red-400'
      return (
        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-sm font-mono font-bold ${colorClass}`}>
          {stringValue}
        </span>
      )
    }

    // Handle Test Case ID with special styling
    if (fieldKey === 'testCaseId') {
      return (
        <span className="inline-flex items-center px-2.5 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 font-mono text-sm font-medium">
          {stringValue}
        </span>
      )
    }

    return <span className="text-gray-200 text-sm">{stringValue}</span>
  }

  return (
    <div className="h-screen w-full overflow-hidden bg-gray-950 p-6 flex flex-col">
      {/* Header - Fixed */}
      <div className="flex items-center gap-4 mb-4 flex-shrink-0">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
          <ClipboardList className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Create Test Case</h1>
          <p className="text-gray-400 text-sm">Generate AI-powered test cases with customizable templates</p>
        </div>
      </div>

      {/* Main Content Area - Takes remaining height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0 overflow-hidden">
        {/* Left Column - Input & Output (3/4 width) */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 overflow-hidden">
          {/* Input Section - Scrollable */}
          <div className="flex-shrink-0 overflow-y-auto max-h-[280px] space-y-3 pr-1">
            {/* Test Type Selection */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Select Test Type</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTestType('ui')}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    testType === 'ui'
                      ? 'border-cyan-500 bg-cyan-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      testType === 'ui' ? 'bg-cyan-500' : 'bg-gray-700'
                    }`}>
                      <FileText className="w-4 h-4 text-white" />
                    </div>
                    <span className={`font-medium text-sm ${testType === 'ui' ? 'text-cyan-400' : 'text-gray-400'}`}>
                      UI Test
                    </span>
                    {testType === 'ui' && <CheckCircle2 className="w-4 h-4 text-cyan-400 ml-auto" />}
                  </div>
                </button>

                <button
                  onClick={() => setTestType('api')}
                  className={`relative p-3 rounded-lg border-2 transition-all ${
                    testType === 'api'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 bg-gray-800/50 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      testType === 'api' ? 'bg-purple-500' : 'bg-gray-700'
                    }`}>
                      <Code className="w-4 h-4 text-white" />
                    </div>
                    <span className={`font-medium text-sm ${testType === 'api' ? 'text-purple-400' : 'text-gray-400'}`}>
                      API Test
                    </span>
                    {testType === 'api' && <CheckCircle2 className="w-4 h-4 text-purple-400 ml-auto" />}
                  </div>
                </button>
              </div>
            </div>

            {/* Test Case Name */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Test Case Name</label>
              <input
                type="text"
                value={testCaseName}
                onChange={(e) => setTestCaseName(e.target.value)}
                placeholder="e.g., User Login Flow Test"
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Test Description */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Test Description <span className="text-gray-500 text-xs">(required if no file uploaded)</span></label>
              <textarea
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder={testType === 'ui'
                  ? 'Describe the UI test scenario...'
                  : 'Describe the API test scenario...'
                }
                rows={2}
                className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none"
              />
            </div>

            {/* Upload File */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
              <label className="text-sm font-medium text-gray-300 mb-2 block">Upload File <span className="text-gray-500 text-xs">(required if no description provided)</span></label>
              {uploadedFile ? (
                <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs text-emerald-400 truncate max-w-[200px]">{uploadedFile.name}</span>
                  </div>
                  <button onClick={removeFile} className="p-1 hover:bg-gray-700 rounded">
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                </div>
              ) : (
                <label className="flex items-center justify-center gap-2 p-3 border border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-gray-600 transition-all">
                  <Upload className="w-4 h-4 text-gray-500" />
                  <span className="text-sm text-gray-400">Click to upload</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept={testType === 'ui' ? '.doc,.docx,.pdf,.png,.jpg,.jpeg,.md,.txt' : '.json,.js,.txt'}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || selectedFields.size === 0 || (!testContent.trim() && !uploadedFile)}
            className="flex-shrink-0 w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Test Case ({selectedFields.size} fields)
              </>
            )}
          </button>

          {/* Generated Test Case Section - Fixed Height with Internal Scroll */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {generatedTestCase ? (
              <div className="h-full bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Generated Test Case</h3>
                      <p className="text-xs text-gray-400">{selectedFields.size} fields • {testType.toUpperCase()} • {generatedTestCase.testCaseId || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={downloadFormat}
                      onChange={(e) => setDownloadFormat(e.target.value as 'csv' | 'json' | 'md')}
                      className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300"
                    >
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="md">Markdown</option>
                    </select>
                    <button
                      onClick={handleDownload}
                      className="flex items-center gap-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-500 rounded text-white text-xs font-medium"
                    >
                      <Download className="w-3 h-3" />
                      Download
                    </button>
                  </div>
                </div>

                {/* Table with Internal Scroll */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-800">
                        {currentTemplateFields
                          .filter(field => selectedFields.has(field.key))
                          .map((field) => (
                            <th key={field.key} className="px-3 py-2 text-left border-b border-gray-700 bg-gray-800">
                              <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider whitespace-nowrap">
                                {field.label}
                              </span>
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="bg-gray-900/30">
                        {currentTemplateFields
                          .filter(field => selectedFields.has(field.key))
                          .map((field) => {
                            const value = generatedTestCase[field.key]
                            return (
                              <td key={field.key} className="px-3 py-2 border-b border-gray-800/50 align-top">
                                <div className="min-w-[80px] max-w-[220px]">
                                  {renderTableCellValue(field.key, value)}
                                </div>
                              </td>
                            )
                          })}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-full bg-gray-900/30 border border-dashed border-gray-700 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <ClipboardList className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Generated test case will appear here</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Template Fields (1/4 width) */}
        <div className="lg:col-span-1 bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex flex-col min-h-0">
            <div className="flex items-center justify-between p-3 border-b border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
                  <LayoutTemplate className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <span className="font-medium text-white text-sm block">Template Fields</span>
                  <span className="text-xs text-gray-500">{selectedFields.size} / {currentTemplateFields.length} selected</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSelectAll}
                  className="px-2.5 py-1 text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                >
                  All
                </button>
                <button
                  onClick={handleDeselectOptional}
                  className="px-2.5 py-1 text-xs font-medium text-gray-400 hover:bg-gray-700 rounded transition-colors"
                >
                  Required
                </button>
              </div>
            </div>

            {/* Single Column Layout - Required fields first */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {/* Required Fields Section */}
              <div className="mb-2">
                <div className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mb-1.5 px-1">Required Fields</div>
                {currentTemplateFields
                  .filter(field => field.required)
                  .map((field) => {
                    const isSelected = selectedFields.has(field.key)
                    return (
                      <div
                        key={field.key}
                        className="flex items-center gap-2.5 p-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 mb-1.5"
                      >
                        <div className="w-4 h-4 rounded bg-cyan-500 flex items-center justify-center flex-shrink-0">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                        <span className="text-sm font-medium text-cyan-300 flex-1">{field.label}</span>
                      </div>
                    )
                  })}
              </div>

              {/* Optional Fields Section */}
              <div>
                <div className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold mb-1.5 px-1">Optional Fields</div>
                {currentTemplateFields
                  .filter(field => !field.required)
                  .map((field) => {
                    const isSelected = selectedFields.has(field.key)
                    return (
                      <button
                        key={field.key}
                        onClick={() => handleFieldToggle(field.key)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left mb-1.5 ${
                          isSelected
                            ? 'border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/15'
                            : 'border-gray-700/50 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-emerald-500' : 'border-2 border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-sm font-medium flex-1 ${
                          isSelected ? 'text-emerald-300' : 'text-gray-400'
                        }`}>
                          {field.label}
                        </span>
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="p-2.5 border-t border-gray-800 bg-gray-900/30 flex-shrink-0">
              <div className="flex items-center justify-center gap-4 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-cyan-500"></div>
                  <span>Required</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded bg-emerald-500"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded border border-gray-600"></div>
                  <span>Optional</span>
                </div>
              </div>
            </div>
        </div>
      </div>
    </div>
  )
}
