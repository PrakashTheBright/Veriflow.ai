import { useState, useEffect } from 'react'
import { FileText, Code, Sparkles, Download, Upload, CheckCircle2, ClipboardList, X, Check, LayoutTemplate, ChevronDown, ChevronUp, Copy, History, Trash2, Save } from 'lucide-react'
import toast from 'react-hot-toast'
import TestCaseHistoryModal from '../components/TestCaseHistoryModal'

// Template field configurations
const UI_TEST_TEMPLATE_FIELDS = [
  { key: 'testCaseId', label: 'Test Case ID', required: true },
  { key: 'testCaseTitle', label: 'Test Case Title / Name', required: true },
  { key: 'moduleName', label: 'Module', required: true },
  { key: 'testType', label: 'Test Type', required: true },
  { key: 'preconditions', label: 'Preconditions', required: true },
  { key: 'testData', label: 'Test Data', required: true },
  { key: 'testSteps', label: 'Test Steps', required: true },
  { key: 'expectedResult', label: 'Expected Result', required: true },
  { key: 'actualResult', label: 'Actual Result', required: true },
  { key: 'status', label: 'Status', required: true },
  { key: 'featureName', label: 'Feature Name', required: false },
  { key: 'requirementId', label: 'Requirement ID', required: false },
  { key: 'priority', label: 'Priority', required: false },
  { key: 'severity', label: 'Severity', required: false },
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
  const [uploadedFileContent, setUploadedFileContent] = useState<string>('')
  const [generatedTestCases, setGeneratedTestCases] = useState<GeneratedTestCaseData[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isReadingFile, setIsReadingFile] = useState(false)
  const [downloadFormat, setDownloadFormat] = useState<'md' | 'json' | 'csv'>('csv')
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set())
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set())
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set())
  const [editingCell, setEditingCell] = useState<{ rowIndex: number; fieldKey: string } | null>(null)
  const [editCellValue, setEditCellValue] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  // Load test cases from history
  const handleLoadFromHistory = (testCases: any[], name: string, type: 'ui' | 'api') => {
    setTestType(type)
    setTestCaseName(name)
    setGeneratedTestCases(testCases)
    // Update selected fields based on what's in the loaded test cases
    if (testCases.length > 0) {
      const fields = Object.keys(testCases[0])
      setSelectedFields(new Set(fields))
    }
  }

  // Toggle cell expansion
  const toggleCellExpand = (cellId: string) => {
    const newExpanded = new Set(expandedCells)
    if (newExpanded.has(cellId)) {
      newExpanded.delete(cellId)
    } else {
      newExpanded.add(cellId)
    }
    setExpandedCells(newExpanded)
  }

  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  // Get current template fields based on test type
  const currentTemplateFields = testType === 'ui' ? UI_TEST_TEMPLATE_FIELDS : API_TEST_TEMPLATE_FIELDS

  // Initialize selected fields with required fields when test type changes
  useEffect(() => {
    const requiredFields = currentTemplateFields
      .filter(field => field.required)
      .map(field => field.key)
    setSelectedFields(new Set(requiredFields))
    setGeneratedTestCases([])
    setSelectedRows(new Set())
    setEditingCell(null)
  }, [testType])

  const handleFieldToggle = (fieldKey: string) => {
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

  // ── Row selection ──────────────────────────────────────────────────────────
  const toggleRowSelection = (index: number) => {
    setSelectedRows(prev => {
      const s = new Set(prev)
      if (s.has(index)) s.delete(index)
      else s.add(index)
      return s
    })
  }

  const toggleAllRows = () => {
    if (selectedRows.size === generatedTestCases.length && generatedTestCases.length > 0) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(generatedTestCases.map((_, i) => i)))
    }
  }

  // ── Inline cell editing ────────────────────────────────────────────────────
  const startCellEdit = (rowIndex: number, fieldKey: string) => {
    const current = generatedTestCases[rowIndex]?.[fieldKey]
    const display = Array.isArray(current)
      ? (current as string[]).join('\n')
      : String(current ?? '')
    setEditingCell({ rowIndex, fieldKey })
    setEditCellValue(display)
  }

  const commitCellEdit = () => {
    if (!editingCell) return
    const { rowIndex, fieldKey } = editingCell
    const original = generatedTestCases[rowIndex]?.[fieldKey]
    const newValue: string | string[] = Array.isArray(original)
      ? editCellValue.split('\n').filter(s => s.trim())
      : editCellValue
    const updated = [...generatedTestCases]
    updated[rowIndex] = { ...updated[rowIndex], [fieldKey]: newValue }
    setGeneratedTestCases(updated)
    setEditingCell(null)
    setEditCellValue('')
  }

  const cancelCellEdit = () => {
    setEditingCell(null)
    setEditCellValue('')
  }

  // ── Delete selected rows ───────────────────────────────────────────────────
  const handleDeleteSelectedRows = () => {
    const count = selectedRows.size
    const remaining = generatedTestCases.filter((_, i) => !selectedRows.has(i))
    setGeneratedTestCases(remaining)
    setSelectedRows(new Set())
    toast.success(`${count} row(s) deleted`)
  }

  // ── Save test cases ────────────────────────────────────────────────────────
  const handleSaveTestCases = async () => {
    if (generatedTestCases.length === 0) {
      toast.error('No test cases to save')
      return
    }
    setIsSaving(true)
    try {
      const historyEntry = {
        testCaseName,
        testType,
        inputSource: (testContent.trim() && uploadedFile) ? 'both'
          : uploadedFile ? 'file'
          : 'description',
        inputFileName: uploadedFile?.name,
        inputDescription: testContent.trim() || undefined,
        testCases: generatedTestCases,
        selectedFields: Array.from(selectedFields),
        createdBy: 'User'
      }
      const res = await fetch('http://localhost:4000/api/testcase-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(historyEntry)
      })
      if (!res.ok) throw new Error('Save failed')
      toast.success('Test cases saved successfully!')
    } catch {
      toast.error('Failed to save test cases')
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadedFile(file)
    setUploadedFileContent('')
    setIsReadingFile(true)

    try {
      // Upload file to server for extraction (handles text, PDF, DOCX, etc.)
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('http://localhost:4000/api/testcases/parse-file', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.message || 'Unable to read uploaded file')
      }

      if (data.isBinary) {
        // Image or unextractable file – let user know and allow description input
        setUploadedFileContent('')
        toast(`File "${file.name}" uploaded. ${data.message}`)
      } else if (data.extractedText && data.extractedText.trim().length > 0) {
        setUploadedFileContent(data.extractedText)
        toast.success(`File "${file.name}" uploaded and content extracted (${data.extractedText.length.toLocaleString()} chars)`)
      } else {
        setUploadedFileContent('')
        toast(`File "${file.name}" uploaded but no text could be extracted. Add a description for better results.`)
      }
    } catch (err: any) {
      toast.error(err.message || 'Unable to read uploaded file')
      setUploadedFile(null)
      setUploadedFileContent('')
    } finally {
      setIsReadingFile(false)
    }
  }

  const removeFile = () => {
    setUploadedFile(null)
    setUploadedFileContent('')
    setIsReadingFile(false)
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
    if (isReadingFile) {
      toast.error('File is still being processed, please wait a moment')
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

      // Prepare content - send both description and file content separately
      const requestBody = {
        testCaseName,
        testType,
        testContent: testContent.trim(),  // Only send manual description
        uploadedFileName: uploadedFile?.name || '',
        uploadedFileContent: uploadedFileContent.trim(),  // Send file content separately
        selectedFields: selectedFieldLabels
      }
      
      console.log('=== Sending to backend ===' )
      console.log('testContent length:', requestBody.testContent.length)
      console.log('uploadedFileContent length:', requestBody.uploadedFileContent.length)
      console.log('uploadedFileName:', requestBody.uploadedFileName)
      
      const response = await fetch('http://localhost:4000/api/testcases/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Test case generation failed. Please try again.')
      }

      const data = await response.json()
      if (!data.success) throw new Error('Invalid response from server')

      // Handle multiple test cases
      const testCasesArray = data.testCases || (data.testCase ? [data.testCase] : [])
      
      // Map each response to selected fields only
      const filteredTestCases: GeneratedTestCaseData[] = testCasesArray.map((tc: any) => {
        const filteredTestCase: GeneratedTestCaseData = {}
        currentTemplateFields.forEach(field => {
          if (selectedFields.has(field.key)) {
            filteredTestCase[field.key] = tc[field.key] || tc[field.label] || '-'
          }
        })
        return filteredTestCase
      })
      
      setGeneratedTestCases(filteredTestCases)
      toast.success(`${filteredTestCases.length} test cases generated successfully!`)
      
      // Save to history (auto-save after generation)
      try {
        const historyEntry = {
          testCaseName,
          testType,
          inputSource: (testContent.trim() && uploadedFile) ? 'both' 
            : uploadedFile ? 'file' 
            : 'description',
          inputFileName: uploadedFile?.name,
          inputDescription: testContent.trim() || undefined,
          testCases: filteredTestCases,
          selectedFields: Array.from(selectedFields),
          createdBy: 'User'
        }
        
        await fetch('http://localhost:4000/api/testcase-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(historyEntry)
        })
      } catch (historyError) {
        console.warn('Failed to save to history:', historyError)
        // Don't show error to user - history is optional
      }
    } catch (error: any) {
      console.error('Error generating test case:', error)
      toast.error(error.message || 'Test case generation failed. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const convertToCSV = (): string => {
    if (generatedTestCases.length === 0) return ''
    
    const selectedFieldsList = currentTemplateFields.filter(f => selectedFields.has(f.key))
    const headers = selectedFieldsList.map(f => f.label)
    const escapeCSV = (val: string | string[] | undefined) => {
      if (!val) return '""'
      const str = Array.isArray(val) ? val.map((s, i) => `${i + 1}. ${s}`).join(' | ') : String(val)
      return `"${str.replace(/"/g, '""')}"`
    }
    
    const rows = generatedTestCases.map(tc => 
      selectedFieldsList.map(f => escapeCSV(tc[f.key])).join(',')
    )
    return [headers.join(','), ...rows].join('\n')
  }

  const convertToJSON = (): string => {
    if (generatedTestCases.length === 0) return '[]'
    const selectedFieldsList = currentTemplateFields.filter(f => selectedFields.has(f.key))
    const output = generatedTestCases.map(tc => {
      const item: { [key: string]: string | string[] | undefined } = {}
      selectedFieldsList.forEach(f => {
        item[f.label] = tc[f.key]
      })
      return item
    })
    return JSON.stringify(output, null, 2)
  }

  const convertToMarkdown = (): string => {
    if (generatedTestCases.length === 0) return ''
    const selectedFieldsList = currentTemplateFields.filter(f => selectedFields.has(f.key))
    let md = `# Test Cases for: ${testCaseName}\n\n`
    md += `**Total Test Cases:** ${generatedTestCases.length}\n\n---\n\n`
    
    generatedTestCases.forEach((tc, index) => {
      md += `## Test Case ${index + 1}: ${tc.testCaseId || tc.testCaseTitle || `TC_${index + 1}`}\n\n`
      selectedFieldsList.forEach(f => {
        const val = tc[f.key]
        if (Array.isArray(val)) {
          md += `### ${f.label}\n${val.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`
        } else {
          md += `**${f.label}:** ${val || '-'}\n\n`
        }
      })
      md += '---\n\n'
    })
    return md
  }

  const handleDownload = () => {
    if (generatedTestCases.length === 0) {
      toast.error('No test cases to download')
      return
    }

    let content: string, fileName: string, mimeType: string
    const baseName = testCaseName.toLowerCase().replace(/\s+/g, '-')

    switch (downloadFormat) {
      case 'csv':
        content = convertToCSV()
        fileName = `${baseName}-test-cases.csv`
        mimeType = 'text/csv'
        break
      case 'json':
        content = convertToJSON()
        fileName = `${baseName}-test-cases.json`
        mimeType = 'application/json'
        break
      case 'md':
      default:
        content = convertToMarkdown()
        fileName = `${baseName}-test-cases.md`
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

  const renderTableCellValue = (fieldKey: string, value: string | string[] | undefined, rowIndex: number) => {
    const cellId = `${rowIndex}-${fieldKey}`
    const isExpanded = expandedCells.has(cellId)
    
    if (!value || value === '-') {
      return <span className="text-gray-500 italic text-sm">-</span>
    }
    
    if (Array.isArray(value)) {
      const shouldCollapse = value.length > 3 && !isExpanded
      const displaySteps = shouldCollapse ? value.slice(0, 2) : value
      return (
        <div className="space-y-1.5">
          {displaySteps.map((step, idx) => (
            <div key={idx} className="flex gap-2 items-start">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-[10px] font-bold">
                {idx + 1}
              </span>
              <span className="text-gray-200 text-sm leading-snug break-words">{step}</span>
            </div>
          ))}
          {value.length > 3 && (
            <button
              onClick={() => toggleCellExpand(cellId)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
            >
              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {isExpanded ? 'Show less' : `Show ${value.length - 2} more steps`}
            </button>
          )}
        </div>
      )
    }

    // Handle long text values
    const stringValue = String(value)
    
    // Check if it looks like JSON
    const isJsonLike = (stringValue.startsWith('{') && stringValue.endsWith('}')) || 
                       (stringValue.startsWith('[') && stringValue.endsWith(']'))
    
    if (isJsonLike) {
      try {
        const parsed = JSON.parse(stringValue)
        const formatted = JSON.stringify(parsed, null, 2)
        const isLongJson = formatted.length > 100
        const displayJson = isLongJson && !isExpanded ? JSON.stringify(parsed) : formatted
        
        return (
          <div className="relative group">
            <pre className={`text-gray-200 text-xs font-mono bg-gray-800/50 p-2 rounded-lg ${isExpanded ? 'whitespace-pre-wrap' : 'whitespace-nowrap overflow-hidden text-ellipsis'} break-all`} style={{ maxWidth: isExpanded ? 'none' : '200px' }}>
              {displayJson}
            </pre>
            <div className="flex gap-1 mt-1">
              {isLongJson && (
                <button
                  onClick={() => toggleCellExpand(cellId)}
                  className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300"
                >
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
              )}
              <button
                onClick={() => copyToClipboard(formatted)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-300"
              >
                <Copy className="w-3 h-3" />
                Copy
              </button>
            </div>
          </div>
        )
      } catch {
        // Not valid JSON, fall through
      }
    }
    
    // Handle long text (URLs, descriptions, etc.)
    const isLongText = stringValue.length > 50
    if (isLongText && !isExpanded) {
      return (
        <div>
          <div className="text-gray-200 text-sm leading-relaxed break-words" style={{ wordBreak: 'break-word' }}>
            {stringValue.substring(0, 50)}...
          </div>
          <button
            onClick={() => toggleCellExpand(cellId)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
          >
            <ChevronDown className="w-3 h-3" />
            Show more
          </button>
        </div>
      )
    }
    
    if (isLongText && isExpanded) {
      return (
        <div>
          <div className="text-gray-200 text-sm leading-relaxed break-words" style={{ wordBreak: 'break-word' }}>
            {stringValue}
          </div>
          <button
            onClick={() => toggleCellExpand(cellId)}
            className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-1"
          >
            <ChevronUp className="w-3 h-3" />
            Show less
          </button>
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
    <div className="min-h-screen w-full bg-gray-950 p-6 flex flex-col">
      {/* Header - Fixed */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ClipboardList className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Test Case</h1>
            <p className="text-gray-400 text-sm">Generate AI-powered test cases with customizable templates</p>
          </div>
        </div>
        <button
          onClick={() => setIsHistoryModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-all"
        >
          <History className="w-4 h-4" />
          <span>View History</span>
        </button>
      </div>

      {/* Main Content Area - Takes remaining height */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-4 gap-4 min-h-0">
        {/* Left Column - Input & Output (3/4 width) */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0">
          {/* Input Section - Static */}
          <div className="flex-shrink-0 space-y-3">
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
              <label className="text-sm font-medium text-gray-300 mb-2 block">Test Case Name <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={testCaseName}
                onChange={(e) => setTestCaseName(e.target.value)}
                placeholder="e.g., User Login Flow Test"
                className={`w-full px-3 py-2 bg-gray-800 border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 ${
                  testCaseName.trim() ? 'border-emerald-500/50' : 'border-gray-700'
                }`}
              />
            </div>

            {/* Input Validation Notice */}
            {(!testContent.trim() && !uploadedFile) && (
              <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-amber-400 text-xs font-bold">!</span>
                </div>
                <p className="text-amber-400 text-xs">
                  Please provide either a <span className="font-semibold">Test Description</span> or <span className="font-semibold">Upload a File</span> to generate test cases.
                </p>
              </div>
            )}

            {/* Test Description */}
            <div className={`bg-gray-900/50 border rounded-xl p-6 transition-all ${
              testContent.trim() ? 'border-emerald-500/50' : (!testContent.trim() && !uploadedFile) ? 'border-amber-500/30' : 'border-gray-800'
            }`}>
              <label className="text-sm font-medium text-gray-300 mb-3 block">
                Test Description 
                <span className="text-gray-500 text-xs ml-1">(required if no file uploaded)</span>
                {testContent.trim() && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline ml-2" />}
              </label>
              <textarea
                value={testContent}
                onChange={(e) => setTestContent(e.target.value)}
                placeholder={testType === 'ui'
                  ? 'Describe the UI test scenario...'
                  : 'Describe the API test scenario...'
                }
                rows={6}
                className={`w-full px-4 py-3 bg-gray-800 border rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-y min-h-[120px] ${
                  testContent.trim() ? 'border-emerald-500/50' : 'border-gray-700'
                }`}
              />
            </div>

            {/* OR Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="text-gray-500 text-xs font-medium uppercase">or</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>

            {/* File priority notice */}
            {testContent.trim() && uploadedFile && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-400 text-xs font-bold">i</span>
                </div>
                <p className="text-blue-400 text-xs">
                  <span className="font-semibold">File input takes priority</span> over Description when both are provided.
                </p>
              </div>
            )}

            {/* Upload File */}
            <div className={`bg-gray-900/50 border rounded-xl p-4 transition-all ${
              uploadedFile ? 'border-emerald-500/50' : (!testContent.trim() && !uploadedFile) ? 'border-amber-500/30' : 'border-gray-800'
            }`}>
              <label className="text-sm font-medium text-gray-300 mb-2 block">
                Upload File 
                <span className="text-gray-500 text-xs ml-1">(required if no description provided)</span>
                {uploadedFile && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 inline ml-2" />}
              </label>
              {uploadedFile ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-xs text-emerald-400 truncate max-w-[200px]">{uploadedFile.name}</span>
                      <span className="text-xs text-gray-500">({(uploadedFile.size / 1024).toFixed(1)} KB)</span>
                    </div>
                    <button onClick={removeFile} className="p-1 hover:bg-gray-700 rounded">
                      <X className="w-3 h-3 text-gray-400" />
                    </button>
                  </div>
                  {/* File Content Preview */}
                  {uploadedFileContent && uploadedFileContent.length > 0 && !uploadedFileContent.startsWith('File uploaded:') && (
                    <div className="mt-2 p-2 bg-gray-800/50 border border-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-400">Content Preview</span>
                        <span className="text-xs text-gray-500">{uploadedFileContent.length.toLocaleString()} chars</span>
                      </div>
                      <pre className="text-xs text-gray-300 font-mono max-h-24 overflow-auto whitespace-pre-wrap break-words">
                        {uploadedFileContent.substring(0, 500)}{uploadedFileContent.length > 500 ? '...' : ''}
                      </pre>
                    </div>
                  )}
                </div>
              ) : (
                <label className={`flex flex-col items-center justify-center gap-2 p-4 border border-dashed rounded-lg cursor-pointer hover:border-gray-600 transition-all ${
                  (!testContent.trim() && !uploadedFile) ? 'border-amber-500/30' : 'border-gray-700'
                }`}>
                  <Upload className="w-5 h-5 text-gray-500" />
                  <span className="text-sm text-gray-400">Click to upload a file</span>
                  <span className="text-xs text-gray-500">
                    {testType === 'ui'
                      ? 'Supports: .txt, .md, .json, .csv, .jpg, .doc, .docx, .pdf'
                      : 'Supports: .json, .yaml, .yml, .txt, .md, .js, .ts, .pdf, .doc, .docx'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleFileUpload}
                    accept={testType === 'ui'
                      ? '.txt,.md,.json,.csv,.jpg,.jpeg,.doc,.docx,.pdf'
                      : '.json,.yaml,.yml,.txt,.md,.js,.ts,.pdf,.doc,.docx'}
                  />
                </label>
              )}
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isReadingFile || selectedFields.size === 0 || (!testContent.trim() && !uploadedFile)}
            className="flex-shrink-0 w-full py-3 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl text-white font-semibold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Generating test cases...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Generate Test Cases ({selectedFields.size} fields)
              </>
            )}
          </button>

          {/* Generated Test Cases Section - Fixed Height with Internal Scroll */}
          <div className="flex-1 min-h-0 overflow-hidden">
            {generatedTestCases.length > 0 ? (
              <div className="h-full bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-3 border-b border-gray-800 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-sm">Generated Test Cases</h3>
                      <p className="text-xs text-gray-400">{generatedTestCases.length} cases • {selectedFields.size} fields • {testType.toUpperCase()}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {selectedRows.size > 0 && (
                      <button
                        onClick={handleDeleteSelectedRows}
                        className="flex items-center gap-1 px-2 py-1 bg-red-600/80 hover:bg-red-500 rounded text-white text-xs font-medium transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete ({selectedRows.size})
                      </button>
                    )}
                    <button
                      onClick={handleSaveTestCases}
                      disabled={isSaving}
                      className="flex items-center gap-1 px-2 py-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded text-white text-xs font-medium transition-colors"
                    >
                      {isSaving ? (
                        <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Save className="w-3 h-3" />
                      )}
                      Save
                    </button>
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
                      Download All
                    </button>
                  </div>
                </div>

                {/* Table with Internal Scroll */}
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse" style={{ tableLayout: 'auto' }}>
                    <thead className="sticky top-0 z-10">
                      <tr className="bg-gray-800">
                        <th className="px-3 py-3 text-left border-b border-gray-700 bg-gray-800" style={{ minWidth: '64px', width: '64px' }}>
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedRows.size === generatedTestCases.length && generatedTestCases.length > 0}
                              onChange={toggleAllRows}
                              className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                            />
                            <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider">#</span>
                          </div>
                        </th>
                        {currentTemplateFields
                          .filter(field => selectedFields.has(field.key))
                          .map((field) => {
                            // Dynamic min-width based on field type
                            const getMinWidth = (key: string) => {
                              if (key === 'testCaseId') return '120px'
                              if (key === 'httpMethod' || key === 'status' || key === 'priority' || key === 'severity' || key === 'expectedStatusCode') return '100px'
                              if (key === 'endpointUrl' || key === 'apiName' || key === 'testCaseTitle' || key === 'featureName') return '180px'
                              if (key === 'requestPayload' || key === 'requestHeaders' || key === 'expectedResponseBody') return '220px'
                              if (key === 'testSteps' || key === 'expectedResult' || key === 'preconditions') return '250px'
                              return '140px'
                            }
                            return (
                              <th 
                                key={field.key} 
                                className="px-3 py-3 text-left border-b border-gray-700 bg-gray-800"
                                style={{ minWidth: getMinWidth(field.key) }}
                              >
                                <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider" style={{ whiteSpace: 'normal', wordWrap: 'break-word' }}>
                                  {field.label}
                                </span>
                              </th>
                            )
                          })}
                      </tr>
                    </thead>
                    <tbody>
                      {generatedTestCases.map((testCase, index) => (
                        <tr key={index} className={`${index % 2 === 0 ? 'bg-gray-900/30' : 'bg-gray-900/50'} hover:bg-gray-800/50 transition-colors`}>
                          <td className="px-3 py-3 border-b border-gray-800/50 align-top" style={{ minWidth: '64px', width: '64px' }}>
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={selectedRows.has(index)}
                                onChange={() => toggleRowSelection(index)}
                                className="w-3.5 h-3.5 rounded accent-cyan-500 cursor-pointer"
                              />
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-700 text-xs text-gray-300 font-medium">{index + 1}</span>
                            </div>
                          </td>
                          {currentTemplateFields
                            .filter(field => selectedFields.has(field.key))
                            .map((field) => {
                              const value = testCase[field.key]
                              return (
                                <td 
                                  key={field.key} 
                                  className="px-3 py-3 border-b border-gray-800/50 align-top"
                                  style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}
                                >
                                  {editingCell?.rowIndex === index && editingCell?.fieldKey === field.key ? (
                                    <textarea
                                      autoFocus
                                      value={editCellValue}
                                      onChange={(e) => setEditCellValue(e.target.value)}
                                      onBlur={commitCellEdit}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Escape') cancelCellEdit()
                                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitCellEdit() }
                                      }}
                                      className="w-full min-h-[60px] px-2 py-1 bg-gray-800 border border-cyan-500 rounded text-white text-sm resize-y focus:outline-none"
                                      placeholder="Edit value (Shift+Enter for new line, Enter to save, Esc to cancel)"
                                    />
                                  ) : (
                                    <div
                                      className="cursor-text hover:bg-gray-700/20 rounded p-0.5 -m-0.5 transition-colors group relative"
                                      onClick={() => startCellEdit(index, field.key)}
                                      title="Click to edit"
                                    >
                                      {renderTableCellValue(field.key, value, index)}
                                    </div>
                                  )}
                                </td>
                              )
                            })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="h-full bg-gray-900/30 border border-dashed border-gray-700 rounded-xl flex items-center justify-center">
                <div className="text-center">
                  <ClipboardList className="w-10 h-10 text-gray-600 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Generated test cases will appear here</p>
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
                      <button
                        key={field.key}
                        onClick={() => handleFieldToggle(field.key)}
                        className={`w-full flex items-center gap-2.5 p-2 rounded-lg border transition-all text-left mb-1.5 ${
                          isSelected
                            ? 'border-cyan-500/40 bg-cyan-500/10 hover:bg-cyan-500/15'
                            : 'border-gray-700/50 bg-gray-800/20 hover:border-gray-600 hover:bg-gray-800/40'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                          isSelected ? 'bg-cyan-500' : 'border-2 border-gray-600'
                        }`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-sm font-medium flex-1 ${
                          isSelected ? 'text-cyan-300' : 'text-gray-400'
                        }`}>
                          {field.label}
                        </span>
                      </button>
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

      {/* Test Case History Modal */}
      <TestCaseHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        onLoadTestCases={handleLoadFromHistory}
      />
    </div>
  )
}
