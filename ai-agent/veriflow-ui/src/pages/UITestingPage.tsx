import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Play, CheckCircle2, XCircle, Clock, Loader2,
  RefreshCw, Eye, Download, ChevronDown, ChevronUp, Server
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { getEnvironmentColor, type Environment } from '../config/environments'

// Load environments from localStorage
const loadEnvironments = (): Environment[] => {
  const stored = localStorage.getItem('veriflow_environments')
  if (stored) {
    const parsed = JSON.parse(stored)
    // Filter to only show UI environments
    return parsed.filter((env: any) => env.type === 'ui')
  }
  // Return empty defaults - credentials and URLs must be configured via .env and Environments page
  return [
    { 
      name: 'sit', 
      label: 'SIT', 
      type: 'ui', 
      baseUrl: '', 
      color: 'blue', 
      icon: '🧪',
      username: '',
      password: ''
    },
    { 
      name: 'uat', 
      label: 'UAT', 
      type: 'ui', 
      baseUrl: '', 
      color: 'yellow', 
      icon: '🚀',
      username: '',
      password: ''
    },
    { 
      name: 'production', 
      label: 'PRODUCTION', 
      type: 'ui', 
      baseUrl: '', 
      color: 'green', 
      icon: '✅',
      username: '',
      password: ''
    },
  ]
}

const loadSelectedEnvironment = (): Environment => {
  // Use a separate key for UI environment to avoid conflict with API testing
  const stored = localStorage.getItem('veriflow_selected_ui_environment')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // Only use the stored environment if it's a UI type
      if (parsed.type === 'ui') {
        return parsed
      }
      // If it's an API environment, fall back to first UI environment
      return loadEnvironments()[0]
    } catch {
      return loadEnvironments()[0]
    }
  }
  return loadEnvironments()[0]
}

interface UITest {
  id: string
  name: string
  fileName: string
  description: string
  status: 'pending' | 'running' | 'passed' | 'failed'
  duration?: number
  reportPath?: string
  progress: number
  executionId?: string
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

export default function UITestingPage() {
  const [tests, setTests] = useState<UITest[]>([])
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

  // Persist selected environment to localStorage (UI-specific key)
  useEffect(() => {
    localStorage.setItem('veriflow_selected_ui_environment', JSON.stringify(selectedEnvironment))
  }, [selectedEnvironment])

  // Fetch tests on mount
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { testCases } = await api.getUITests()
        setTests(testCases.map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          fileName: tc.fileName,
          description: `Execute ${tc.name} test flow`,
          status: 'pending',
          progress: 0,
        })))
      } catch (error) {
        console.error('Failed to fetch tests:', error)
        toast.error('Failed to load test cases')
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
        t.id === testId ? { ...t, status: 'running' as const, progress: 0 } : t
      )
    )

    // Subscribe to real-time updates
    const unsubscribe = subscribeToTest(testId, (status) => {
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? {
                ...t,
                status: status.status,
                progress: status.progress,
                duration: status.duration,
                reportPath: status.reportPath,
              }
            : t
        )
      )

      if (status.status === 'passed') {
        toast.success(`${test.name} passed!`)
        unsubscribe?.()
      } else if (status.status === 'failed') {
        toast.error(`${test.name} failed`)
        unsubscribe?.()
      }
    })

    try {
      // Pass environment configuration including username and password for UI tests
      const environmentConfig = {
        username: (selectedEnvironment as any).username,
        password: (selectedEnvironment as any).password,
      }
      const response = await api.executeTest(testId, 'ui', test.fileName, selectedEnvironment.baseUrl, environmentConfig)
      // Store the execution ID
      if (response.executionId) {
        setTests((prev) =>
          prev.map((t) =>
            t.id === testId ? { ...t, executionId: response.executionId } : t
          )
        )
      }
    } catch (error) {
      setTests((prev) =>
        prev.map((t) =>
          t.id === testId
            ? { ...t, status: 'failed', progress: 100 }
            : t
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
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
    setRunningAll(false)
    toast.success('All tests completed!')
  }

  const resetTests = () => {
    setTests(prev => prev.map(t => ({
      ...t,
      status: 'pending' as const,
      progress: 0,
      duration: undefined,
      reportPath: undefined,
      executionId: undefined,
    })))
    toast.success('Tests reset')
  }

  const viewReport = async (testId: string) => {
    const test = tests.find(t => t.id === testId)
    if (!test?.executionId) {
      toast.error('No execution ID available for this test')
      return
    }
    try {
      const html = await api.viewReport(test.executionId)
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(html)
        newWindow.document.close()
      }
    } catch (error) {
      toast.error('Failed to load report')
    }
  }

  const downloadReport = async (testId: string) => {
    const test = tests.find(t => t.id === testId)
    if (!test?.executionId) {
      toast.error('No execution ID available for this test')
      return
    }
    try {
      await api.downloadReport(test.executionId)
      toast.success('Report downloaded')
    } catch (error) {
      toast.error('Failed to download report')
    }
  }

  const getStatusIcon = (status: UITest['status']) => {
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
          <Loader2 className="w-12 h-12 text-neon-blue animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading test cases...</p>
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
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center shadow-lg shadow-neon-blue/20">
                <Globe className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">UI Testing</h1>
                <p className="text-dark-400 text-sm">
                  Execute browser-based UI tests from <code className="text-neon-blue bg-neon-blue/10 px-2 py-0.5 rounded">test-cases/approved/</code>
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
                      {environments.filter(env => env.type === 'ui').map((env) => (
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
                className="btn-primary flex items-center gap-2 disabled:opacity-50 hover:scale-105 transition-transform"
              >
                {runningAll ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Run All Tests
              </button>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4 relative z-10">
        {[
          { label: 'Total', value: tests.length, color: 'neon-blue' },
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
                    <h3 className="text-lg font-semibold text-white">{test.name}</h3>
                    <p className="text-dark-400 text-sm">{test.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {test.status === 'running' && (
                    <div className="w-32">
                      <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-gradient-to-r from-neon-blue to-neon-cyan"
                          initial={{ width: 0 }}
                          animate={{ width: `${test.progress}%` }}
                          transition={{ duration: 0.3 }}
                        />
                      </div>
                      <p className="text-xs text-dark-400 mt-1 text-center">
                        {Math.round(test.progress)}%
                      </p>
                    </div>
                  )}

                  {test.duration && (
                    <span className="text-dark-400 text-sm font-mono">
                      {(test.duration / 1000).toFixed(1)}s
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
                      <Loader2 className="w-5 h-5 text-neon-blue animate-spin" />
                    ) : (
                      <Play className="w-5 h-5 text-neon-blue" />
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
                        <p className="text-dark-400 text-sm mb-1">File Name</p>
                        <code className="text-neon-blue">{test.fileName}</code>
                      </div>
                      <div>
                        <p className="text-dark-400 text-sm mb-1">Location</p>
                        <code className="text-dark-300">test-cases/approved/{test.fileName}</code>
                      </div>
                    </div>

                    {test.reportPath && (
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => viewReport(test.id)}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <Eye className="w-4 h-4" />
                          View Report
                        </button>
                        <button 
                          onClick={() => downloadReport(test.id)}
                          className="btn-secondary flex items-center gap-2 text-sm"
                        >
                          <Download className="w-4 h-4" />
                          Download
                        </button>
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
