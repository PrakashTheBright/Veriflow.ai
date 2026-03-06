import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Cpu, Play, CheckCircle2, XCircle, Clock, Loader2,
  RefreshCw, ChevronDown, ChevronUp, Send, Code, ArrowRight, Server
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { getEnvironmentColor, type Environment } from '../config/environments'

// Migrate environment data - fix URLs (credentials fetched from localStorage which came from server)
const migrateEnvironment = (env: any): any => {
  const updated = { ...env }
  
  // Fix API environment URLs - remove /v3 suffix if present (endpoint already includes /v3)
  if (updated.type === 'api' && updated.baseUrl) {
    updated.baseUrl = updated.baseUrl.replace(/\/v3\/?$/, '')
  }
  
  // Credentials should already be in localStorage from EnvironmentsPage API fetch
  // No hardcoded credentials here - they come from the server via EnvironmentsPage
  
  return updated
}

// Load environments from localStorage (credentials already fetched by EnvironmentsPage)
const loadEnvironments = (): Environment[] => {
  const stored = localStorage.getItem('veriflow_environments')
  if (stored) {
    const parsed = JSON.parse(stored)
    // Migrate and filter to only show API environments
    const migrated = parsed.map(migrateEnvironment).filter((env: any) => env.type === 'api')
    // Save migrated data back to localStorage
    localStorage.setItem('veriflow_environments', JSON.stringify(parsed.map(migrateEnvironment)))
    return migrated
  }
  // Return empty defaults - credentials and URLs must be configured via .env and Environments page
  return [
    { 
      name: 'api-sit', 
      label: 'API SIT', 
      type: 'api', 
      baseUrl: '', 
      color: 'blue', 
      icon: '⚡',
      apiKey: '',
      clientId: '',
      headers: { 'Content-Type': 'application/json' }
    },
    { 
      name: 'api-uat', 
      label: 'API UAT', 
      type: 'api', 
      baseUrl: '', 
      color: 'yellow', 
      icon: '🚀',
      apiKey: '',
      clientId: '',
      headers: { 'Content-Type': 'application/json' }
    },
    { 
      name: 'api-production', 
      label: 'API PRODUCTION', 
      type: 'api', 
      baseUrl: '', 
      color: 'green', 
      icon: '✅',
      apiKey: '',
      clientId: '',
      headers: { 'Content-Type': 'application/json' }
    },
  ]
}

const loadSelectedEnvironment = (): Environment => {
  // Use a separate key for API environment to avoid conflict with UI testing
  const stored = localStorage.getItem('veriflow_selected_api_environment')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // Migrate the selected environment as well
      const migrated = migrateEnvironment(parsed)
      // Save migrated version back
      localStorage.setItem('veriflow_selected_api_environment', JSON.stringify(migrated))
      return migrated
    } catch {
      return loadEnvironments()[0]
    }
  }
  return loadEnvironments()[0]
}

interface APITest {
  id: string
  name: string
  fileName: string
  description: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  endpoint: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  request?: object
  response?: object
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const methodColors: Record<string, string> = {
  GET: 'bg-green-500/20 text-green-400',
  POST: 'bg-blue-500/20 text-blue-400',
  PUT: 'bg-yellow-500/20 text-yellow-400',
  DELETE: 'bg-red-500/20 text-red-400',
}

// Default API test cases when backend isn't available
const defaultTests: APITest[] = [
  {
    id: 'api-1',
    name: 'Create Assessment API',
    fileName: 'create-assessment.json',
    description: 'Creates a new assessment via API',
    method: 'POST',
    endpoint: '/api/v1/assessments',
    status: 'pending',
  },
  {
    id: 'api-2',
    name: 'Create Candidate API',
    fileName: 'create-candidate.json',
    description: 'Creates a new candidate record',
    method: 'POST',
    endpoint: '/api/v1/candidates',
    status: 'pending',
  },
  {
    id: 'api-3',
    name: 'Add Resume to Candidate API',
    fileName: 'add-resume.json',
    description: 'Uploads and attaches resume to candidate',
    method: 'POST',
    endpoint: '/api/v1/candidates/:id/resume',
    status: 'pending',
  },
  {
    id: 'api-4',
    name: 'Attach Candidate to Assessment API',
    fileName: 'attach-candidate.json',
    description: 'Links candidate to assessment',
    method: 'POST',
    endpoint: '/api/v1/assessments/:id/candidates',
    status: 'pending',
  },
  {
    id: 'api-5',
    name: 'E2E – Complete Workflow API',
    fileName: 'e2e-workflow.json',
    description: 'Full end-to-end workflow execution',
    method: 'POST',
    endpoint: '/api/v1/workflow/complete',
    status: 'pending',
  },
]

export default function APITestingPage() {
  const [tests, setTests] = useState<APITest[]>(defaultTests)
  const [loading, setLoading] = useState(true)
  const [runningAll, setRunningAll] = useState(false)
  const [expandedTest, setExpandedTest] = useState<string | null>(null)
  const [environments, setEnvironments] = useState<Environment[]>(loadEnvironments())
  const [selectedEnvironment, setSelectedEnvironment] = useState<Environment>(loadSelectedEnvironment())
  const [showEnvDropdown, setShowEnvDropdown] = useState(false)
  const { subscribeToTest } = useSocket()

  // Listen for environment updates from localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const envs = loadEnvironments()
      setEnvironments(envs)
      // Update selected if it was deleted
      if (!envs.find(e => e.name === selectedEnvironment.name)) {
        setSelectedEnvironment(envs[0])
      }
    }
    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('environmentsUpdated', handleStorageChange)
    // Also check on focus (for same-tab updates)
    const handleFocus = () => handleStorageChange()
    window.addEventListener('focus', handleFocus)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('environmentsUpdated', handleStorageChange)
      window.removeEventListener('focus', handleFocus)
    }
  }, [selectedEnvironment.name])

  // Persist selected environment to localStorage (API-specific key)
  useEffect(() => {
    localStorage.setItem('veriflow_selected_api_environment', JSON.stringify(selectedEnvironment))
  }, [selectedEnvironment])

  // Load API tests on mount
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { testCases } = await api.getAPITests()
        if (testCases.length > 0) {
          setTests(testCases.map((tc: any) => ({
            id: tc.id,
            name: tc.name,
            fileName: tc.fileName,
            description: `Execute ${tc.name} API test`,
            method: 'POST' as const,
            endpoint: `/api/v1/${tc.name.toLowerCase().replace(/\s+/g, '-')}`,
            status: 'pending',
          })))
        } else {
          setTests(defaultTests)
        }
      } catch (error) {
        console.error('Failed to fetch API tests:', error)
        setTests(defaultTests)
      } finally {
        setLoading(false)
      }
    }
    fetchTests()
  }, [])

  const runTest = useCallback(async (testId: string) => {
    const test = tests.find(t => t.id === testId)
    if (!test) return

    setTests((prev) =>
      prev.map((t) =>
        t.id === testId ? { ...t, status: 'running' as const } : t
      )
    )

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTest(testId, async (status) => {
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: status.status,
                duration: status.duration,
              }
            : t
        )
      )

      if (status.status === 'passed' || status.status === 'failed') {
        // Fetch the execution details to get the response_data
        try {
          const execution = await api.getExecutionStatus(status.executionId || testId)
          setTests((prev) =>
            prev.map((t) =>
              t.id === testId
                ? {
                    ...t,
                    response: execution.response_data || (status.status === 'passed'
                      ? { status: 200, data: { success: true } }
                      : { status: 400, error: 'Test failed' }),
                  }
                : t
            )
          )
        } catch (err) {
          console.error('Failed to fetch execution details:', err)
        }

        if (status.status === 'passed') {
          toast.success(`${test.name} passed!`)
        } else {
          toast.error(`${test.name} failed`)
        }
        unsubscribe?.()
      }
    })

    try {
      // Pass environment configuration including apiKey and clientId for API tests
      const environmentConfig = {
        apiKey: (selectedEnvironment as any).apiKey,
        clientId: (selectedEnvironment as any).clientId,
        headers: (selectedEnvironment as any).headers,
      }
      // Pass environment name to ensure correct environment-specific credentials are used on server
      await api.executeTest(testId, 'api', test.fileName, selectedEnvironment.baseUrl, environmentConfig, selectedEnvironment.name)
    } catch (error) {
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId ? { ...t, status: 'failed' } : t
        )
      )
      toast.error('Test execution failed')
      unsubscribe?.()
    }
  }, [tests, subscribeToTest, selectedEnvironment])

  const runAllTests = async () => {
    setRunningAll(true)
    for (const test of tests) {
      if (test.status !== 'running') {
        await runTest(test.id)
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
    setRunningAll(false)
    toast.success('All API tests completed!')
  }

  const runE2EWorkflow = async () => {
    setRunningAll(true)
    toast.loading('Running E2E Workflow...', { id: 'e2e' })
    
    for (const test of tests) {
      await runTest(test.id)
      await new Promise((resolve) => setTimeout(resolve, 500))
    }
    
    toast.dismiss('e2e')
    setRunningAll(false)
    toast.success('E2E Workflow completed!')
  }

  const resetTests = () => {
    setTests(prev => prev.map(t => ({
      ...t,
      status: 'pending' as const,
      duration: undefined,
      request: undefined,
      response: undefined,
    })))
    toast.success('Tests reset')
  }

  const getStatusIcon = (status: APITest['status']) => {
    switch (status) {
      case 'passed':
        return <CheckCircle2 className="w-5 h-5 text-neon-green" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-400" />
      case 'running':
        return <Loader2 className="w-5 h-5 text-neon-blue animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-dark-400" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-neon-purple animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading API test cases...</p>
        </div>
      </div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="relative z-[60]" style={{ overflow: 'visible' }}>
        <div className="glass-card p-6 rounded-2xl border border-white/5" style={{ overflow: 'visible' }}>
          <div className="flex items-center justify-between" style={{ overflow: 'visible' }}>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-purple/20">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">API Testing</h1>
                <p className="text-dark-400 text-sm">
                  Validate REST APIs from <code className="text-neon-purple bg-neon-purple/10 px-2 py-0.5 rounded">api-test/</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Environment Selector */}
              <div className="relative z-[100]">
                <button
                  onClick={() => setShowEnvDropdown(!showEnvDropdown)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${getEnvironmentColor(selectedEnvironment.name)}`}
                >
                  <Server className="w-4 h-4" />
                  <span className="font-medium">{selectedEnvironment.icon} {selectedEnvironment.label}</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showEnvDropdown ? 'rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showEnvDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-dark-900 border border-white/10 rounded-xl overflow-hidden shadow-2xl z-[100]"
                    >
                      {environments.filter(env => env.type === 'api').map((env) => (
                        <button
                          key={env.name}
                          onClick={() => {
                            setSelectedEnvironment(env)
                            setShowEnvDropdown(false)
                            toast.success(`Switched to ${env.label}`)
                          }}
                          className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition-colors ${
                            selectedEnvironment.name === env.name ? 'bg-white/5' : ''
                          }`}
                        >
                          <span className="text-xl">{env.icon}</span>
                          <div className="flex-1 text-left">
                            <div className="text-white font-medium">{env.label}</div>
                            <div className="text-dark-400 text-xs">{env.baseUrl}</div>
                          </div>
                          {selectedEnvironment.name === env.name && (
                            <CheckCircle2 className="w-4 h-4 text-neon-green" />
                          )}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                onClick={resetTests}
                className="btn-secondary flex items-center gap-2 hover:scale-105 transition-transform"
              >
                <RefreshCw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={runAllTests}
                disabled={runningAll}
                className="btn-secondary flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-transform"
              >
                {runningAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run All
              </button>
              <button
                onClick={runE2EWorkflow}
                disabled={runningAll}
                className="btn-primary flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-transform"
              >
                {runningAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                Run E2E Flow
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Total', value: tests.length, color: 'neon-purple' },
          { label: 'Passed', value: tests.filter((t) => t.status === 'passed').length, color: 'neon-green' },
          { label: 'Failed', value: tests.filter((t) => t.status === 'failed').length, color: 'red-400' },
          { label: 'Running', value: tests.filter((t) => t.status === 'running').length, color: 'yellow-400' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 rounded-xl text-center">
            <p className={`text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
            <p className="text-dark-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Test List */}
      <motion.div variants={itemVariants} className="space-y-4">
        {tests.map((test) => (
          <motion.div
            key={test.id}
            layout
            className="glass-card rounded-xl overflow-hidden"
          >
            <div
              className="p-5 cursor-pointer"
              onClick={() => setExpandedTest(expandedTest === test.id ? null : test.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(test.status)}
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                      <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${methodColors[test.method]}`}>
                        {test.method}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {test.status === 'running' && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-neon-blue animate-pulse" />
                      <span className="text-neon-blue text-sm">Executing...</span>
                    </div>
                  )}

                  {test.duration && (
                    <span className="text-dark-400 text-sm font-mono">
                      {(test.duration / 1000).toFixed(2)}s
                    </span>
                  )}

                  <span className={`status-badge ${
                    test.status === 'passed' ? 'status-passed' :
                    test.status === 'failed' ? 'status-failed' :
                    test.status === 'running' ? 'status-running' : 'status-pending'
                  }`}>
                    {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      runTest(test.id)
                    }}
                    disabled={test.status === 'running'}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
                  >
                    {test.status === 'running' ? (
                      <Loader2 className="w-5 h-5 text-neon-purple animate-spin" />
                    ) : (
                      <Send className="w-5 h-5 text-neon-purple" />
                    )}
                  </button>

                  {expandedTest === test.id ? (
                    <ChevronUp className="w-5 h-5 text-dark-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-dark-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Expanded Details */}
            <AnimatePresence>
              {expandedTest === test.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-t border-white/5"
                >
                  <div className="p-5 bg-dark-900/50">
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-dark-400 text-sm mb-1">Description</p>
                        <p className="text-white">{test.description}</p>
                      </div>
                      <div>
                        <p className="text-dark-400 text-sm mb-1">File</p>
                        <code className="text-neon-purple">api-test/{test.fileName}</code>
                      </div>
                    </div>

                    {(test.request || test.response) && (
                      <div className="grid grid-cols-2 gap-4">
                        {test.request && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="w-4 h-4 text-neon-blue" />
                              <p className="text-dark-400 text-sm font-medium">Request</p>
                            </div>
                            <pre className="p-3 bg-dark-800 rounded-lg text-sm font-mono text-dark-200 overflow-x-auto">
                              {JSON.stringify(test.request, null, 2)}
                            </pre>
                          </div>
                        )}
                        {test.response && (
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Code className="w-4 h-4 text-neon-green" />
                              <p className="text-dark-400 text-sm font-medium">Response</p>
                            </div>
                            <pre className={`p-3 rounded-lg text-sm font-mono overflow-x-auto ${
                              test.status === 'passed' 
                                ? 'bg-green-500/10 text-green-300' 
                                : 'bg-red-500/10 text-red-300'
                            }`}>
                              {JSON.stringify(test.response, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  )
}
