import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Globe, Play, CheckCircle2, XCircle, Clock, Loader2,
  RefreshCw, Eye, Download, ChevronDown, ChevronUp, Server
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'
import { useSocket } from '../hooks/useSocket'
import { getEnvironmentColor, type Environment } from '../config/environments'

const DEFAULT_UI_ENVIRONMENTS: Environment[] = [
  { name: 'sit', label: 'SIT', type: 'ui', baseUrl: '', color: 'blue', icon: '🧪', username: '', password: '' },
  { name: 'uat', label: 'UAT', type: 'ui', baseUrl: '', color: 'yellow', icon: '🚀', username: '', password: '' },
  { name: 'production', label: 'PRODUCTION', type: 'ui', baseUrl: '', color: 'green', icon: '✅', username: '', password: '' },
]

// Load environments from localStorage — safe against malformed JSON or empty/API-only stores.
const loadEnvironments = (): Environment[] => {
  try {
    const stored = localStorage.getItem('veriflow_environments')
    if (stored) {
      const parsed = JSON.parse(stored)
      const uiEnvs = parsed.filter((env: any) => env.type === 'ui')
      if (uiEnvs.length > 0) return uiEnvs
    }
  } catch {
    // Malformed localStorage — fall through to defaults
  }
  return DEFAULT_UI_ENVIRONMENTS
}

const loadSelectedEnvironment = (): Environment => {
  try {
    const stored = localStorage.getItem('veriflow_selected_ui_environment')
    if (stored) {
      const parsed = JSON.parse(stored)
      if (parsed?.type === 'ui') return parsed
    }
  } catch {
    // Malformed localStorage — fall through to defaults
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
  const pollingIntervalsRef = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map())
  // Ref mirror for latest tests state — avoids stale closures in useCallback without
  // making every status update recreate runTest.
  const testsRef = useRef<UITest[]>([])
  // Synchronous guard: tracks tests that have a pending/active API call. Prevents
  // double-execution from rapid clicks before React re-renders the disabled button.
  const runningGuardRef = useRef<Set<string>>(new Set())
  // Store unsubscribe functions so they can be called on cleanup.
  const unsubscribeRefs = useRef<Map<string, (() => void) | undefined>>(new Map())
  // Completion resolvers: each entry resolves the Promise returned by runTest().
  // Allows runAllTests to await true completion before starting the next test.
  const completionResolversRef = useRef<Map<string, () => void>>(new Map())
  // Track the executionId for each running testId. Socket events whose executionId
  // does NOT match are from a previous (stale) execution and are discarded.
  // This prevents false 'failed' toasts when the backend reloads between runs.
  const expectedExecutionIdRef = useRef<Map<string, string>>(new Map())

  const stopExecutionPolling = useCallback((testId: string) => {
    const timer = pollingIntervalsRef.current.get(testId)
    if (timer) {
      clearInterval(timer)
      pollingIntervalsRef.current.delete(testId)
    }
  }, [])

  const startExecutionPolling = useCallback((testId: string, executionId: string) => {
    // Prevent duplicate polling for the same test card
    stopExecutionPolling(testId)

    const startedAt = Date.now()
    const timer = setInterval(async () => {
      try {
        const execution = await api.getExecutionStatus(executionId)
        const normalizedStatus = execution?.status as UITest['status']

        // Reconcile status if socket update was missed.
        // Only show toast + resolve completion if the socket handler hasn't already done so
        // (i.e. the resolver is still present). This prevents duplicate toasts.
        if (normalizedStatus === 'passed' || normalizedStatus === 'failed') {
          setTests((prev) =>
            prev.map((t) =>
              t.id === testId
                ? {
                    ...t,
                    status: normalizedStatus,
                    progress: 100,
                    duration: execution?.duration ?? t.duration,
                    reportPath: execution?.report_path ?? t.reportPath,
                  }
                : t
            )
          )

          if (completionResolversRef.current.has(testId)) {
            const testName = testsRef.current.find(t => t.id === testId)?.name || 'Test'
            if (normalizedStatus === 'passed') {
              toast.success(`${testName} completed successfully`)
            } else {
              toast.error(`${testName} failed`)
            }
            completionResolversRef.current.get(testId)?.()
            completionResolversRef.current.delete(testId)
            runningGuardRef.current.delete(testId)
          }
          // Unsubscribe from socket so late progress events don't reset the terminal status.
          unsubscribeRefs.current.get(testId)?.()
          unsubscribeRefs.current.delete(testId)
          stopExecutionPolling(testId)
          return
        }

        // Safety timeout for stale "running" jobs shown in UI.
        if (Date.now() - startedAt > 15 * 60 * 1000) {
          setTests((prev) =>
            prev.map((t) =>
              t.id === testId ? { ...t, status: 'failed', progress: 100 } : t
            )
          )
          toast.error('Test status timed out. Please retry execution.')
          completionResolversRef.current.get(testId)?.()
          completionResolversRef.current.delete(testId)
          runningGuardRef.current.delete(testId)
          stopExecutionPolling(testId)
        }
      } catch {
        // Keep polling on transient API errors.
      }
    }, 3000)

    pollingIntervalsRef.current.set(testId, timer)
  }, [stopExecutionPolling])

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

  // Keep testsRef in sync with state so useCallback closures always see latest tests.
  useEffect(() => {
    testsRef.current = tests
  }, [tests])

  // Cleanup polling timers and socket subscriptions on unmount
  useEffect(() => {
    return () => {
      pollingIntervalsRef.current.forEach((timer) => clearInterval(timer))
      pollingIntervalsRef.current.clear()
      unsubscribeRefs.current.forEach((fn) => fn?.())
      unsubscribeRefs.current.clear()
      // Resolve pending completions so any awaiting runAllTests loop can exit cleanly.
      completionResolversRef.current.forEach((resolve) => resolve())
      completionResolversRef.current.clear()
      expectedExecutionIdRef.current.clear()
    }
  }, [])

  // Fetch tests on mount and hydrate with last known execution status from DB
  useEffect(() => {
    const fetchTests = async () => {
      try {
        const { testCases } = await api.getUITests()

        // Build initial test list with pending status
        const initialTests: UITest[] = testCases.map((tc: any) => ({
          id: tc.id,
          name: tc.name,
          fileName: tc.fileName,
          description: `Execute ${tc.name} test flow`,
          status: 'pending' as const,
          progress: 0,
        }))

        // Hydrate with the most recent execution result from the DB so the page
        // shows real Passed/Failed badges instead of always starting as Pending.
        try {
          const { reports } = await api.getReports({ type: 'ui', limit: 100 })
          if (reports && reports.length > 0) {
            // Build a map: normalised test name → most recent report
            // Reports are returned newest-first from the API.
            const latestByName = new Map<string, any>()
            for (const r of reports) {
              const normName = (r.name || '').toLowerCase().replace(/[-_\s]+/g, '-')
              if (!latestByName.has(normName)) latestByName.set(normName, r)
            }

            setTests(initialTests.map(t => {
              const normName = t.fileName.replace(/\.md$/, '').toLowerCase()
              const lastRun = latestByName.get(normName)
              if (!lastRun) return t
              const lastStatus = lastRun.status === 'passed' ? 'passed'
                : lastRun.status === 'failed' ? 'failed'
                : 'pending'
              return {
                ...t,
                status: lastStatus,
                duration: lastRun.duration,
                progress: lastStatus === 'pending' ? 0 : 100,
              }
            }))
            return
          }
        } catch {
          // Reports fetch is best-effort — fall back to pending state
        }

        setTests(initialTests)
      } catch (error) {
        console.error('Failed to fetch tests:', error)
        toast.error('Failed to load test cases')
      } finally {
        setLoading(false)
      }
    }
    fetchTests()
  }, [])

  const runTest = useCallback(async (testId: string): Promise<void> => {
    // Synchronous guard — prevents double-execution before React re-renders the
    // disabled button state (e.g. rapid double-click).
    if (runningGuardRef.current.has(testId)) return
    runningGuardRef.current.add(testId)

    // Use testsRef so this callback never depends on stale `tests` state.
    const test = testsRef.current.find(t => t.id === testId)
    if (!test) {
      runningGuardRef.current.delete(testId)
      return
    }

    // Cancel any previous subscription for this testId before creating a new one.
    unsubscribeRefs.current.get(testId)?.()
    unsubscribeRefs.current.delete(testId)
    // Resolve and discard any stale completion resolver.
    completionResolversRef.current.get(testId)?.()
    completionResolversRef.current.delete(testId)

    setTests((prev) =>
      prev.map((t) =>
        t.id === testId ? { ...t, status: 'running' as const, progress: 0 } : t
      )
    )

    // Create a completion promise. runTest awaits this before returning, so
    // callers (runAllTests) get true sequential execution — each test fully
    // completes before the next one starts.
    let resolveCompletion!: () => void
    const completionPromise = new Promise<void>(res => { resolveCompletion = res })
    completionResolversRef.current.set(testId, resolveCompletion)

    const complete = () => {
      completionResolversRef.current.get(testId)?.()
      completionResolversRef.current.delete(testId)
    }

    // Subscribe to real-time socket updates.
    const unsubscribe = subscribeToTest(testId, (status) => {
      const expectedExecId = expectedExecutionIdRef.current.get(testId)
      // PENDING_EXECUTION: the HTTP round-trip is still in-flight and we don't
      // know the authoritative executionId yet. Block ALL socket events during
      // this window — this prevents a stale 'failed' event from a prior run
      // (different executionId) from passing the guard and flipping the card
      // to Failed before the real agent even starts.
      if (expectedExecId === 'PENDING_EXECUTION') return
      // Stale-event guard: discard events whose executionId doesn't match the
      // authoritative one we received from the HTTP response.
      if ((status as any).executionId && expectedExecId && (status as any).executionId !== expectedExecId) {
        console.warn(`[Socket] Discarding stale event for ${testId}: got executionId ${ (status as any).executionId}, expected ${expectedExecId}`)
        return
      }

      setTests((prev) =>
        prev.map((t) => {
          if (t.id !== testId) return t
          // Guard: never let a late 'running' progress event override a terminal
          // status that polling already set. This prevents the card from bouncing
          // back to "Running" after a "Failed" / "Passed" toast fired.
          if ((t.status === 'passed' || t.status === 'failed') && status.status === 'running') {
            return t
          }
          return {
            ...t,
            status: status.status,
            progress: status.progress,
            duration: status.duration,
            reportPath: status.reportPath,
          }
        })
      )

      if (status.status === 'passed') {
        // Only toast if polling hasn't already handled this completion (prevents duplicate toasts).
        if (completionResolversRef.current.has(testId)) {
          toast.success(`${test.name} passed!`)
        }
        expectedExecutionIdRef.current.delete(testId)
        stopExecutionPolling(testId)
        unsubscribeRefs.current.get(testId)?.()
        unsubscribeRefs.current.delete(testId)
        runningGuardRef.current.delete(testId)
        complete()
      } else if (status.status === 'failed') {
        // Only toast if polling hasn't already handled this completion (prevents duplicate toasts).
        if (completionResolversRef.current.has(testId)) {
          toast.error(`${test.name} failed`)
        }
        expectedExecutionIdRef.current.delete(testId)
        stopExecutionPolling(testId)
        unsubscribeRefs.current.get(testId)?.()
        unsubscribeRefs.current.delete(testId)
        runningGuardRef.current.delete(testId)
        complete()
      }
    })
    unsubscribeRefs.current.set(testId, unsubscribe)

    // Block all socket events until the HTTP response tells us the real executionId.
    // Without this sentinel a stale 'failed' event from a previous run can arrive
    // in the null-expectedExecId window, get stored as the expected ID, and flip
    // the card to Failed while the real agent is still starting.
    expectedExecutionIdRef.current.set(testId, 'PENDING_EXECUTION')

    try {
      const environmentConfig = {
        username: (selectedEnvironment as any).username,
        password: (selectedEnvironment as any).password,
      }
      const response = await api.executeTest(
        testId, 'ui', test.fileName,
        selectedEnvironment.baseUrl, environmentConfig, selectedEnvironment.name
      )
      if (response.executionId) {
        // Replace the PENDING sentinel with the authoritative executionId.
        // Socket events are now unblocked for exactly this execution run.
        expectedExecutionIdRef.current.set(testId, response.executionId)
        setTests((prev) =>
          prev.map((t) =>
            t.id === testId ? { ...t, executionId: response.executionId } : t
          )
        )
        startExecutionPolling(testId, response.executionId)
      } else {
        // Server returned success but no executionId — clear PENDING so socket
        // events are not permanently blocked on this test card.
        expectedExecutionIdRef.current.delete(testId)
      }
    } catch (error) {
      console.error(`[runTest Error] testId=${testId}:`, error);
      const message = error instanceof Error ? error.message : 'Test execution failed'
      // Treat "already running" (same test) AND "another UI test" (different test / global lock)
      // as non-fatal — restore to pending so the card doesn't permanently show Failed.
      const isAlreadyRunning = message.toLowerCase().includes('already running')
        || message.toLowerCase().includes('another ui test')

      if (isAlreadyRunning) {
        toast.error('A UI test is already running. Please wait for it to complete.')
        // Restore card to pending so it doesn't show a phantom Running state.
        setTests((prev) =>
          prev.map((t) =>
            t.id === testId && t.status === 'running' ? { ...t, status: 'pending', progress: 0 } : t
          )
        )
        runningGuardRef.current.delete(testId)
        complete()
      } else {
        setTests((prev) =>
          prev.map((t) =>
            t.id === testId ? { ...t, status: 'failed', progress: 100 } : t
          )
        )
        toast.error(`Error: ${message}`)
        stopExecutionPolling(testId)
        unsubscribeRefs.current.get(testId)?.()
        unsubscribeRefs.current.delete(testId)
        runningGuardRef.current.delete(testId)
        expectedExecutionIdRef.current.delete(testId)
        complete()
      }
    }

    // Await full completion before returning. This is what makes runAllTests sequential:
    // it awaits runTest(), which only resolves here when the test reaches passed/failed.
    await completionPromise
  // Removed `tests` from deps — testsRef.current is used instead to avoid stale closures.
  }, [subscribeToTest, selectedEnvironment, startExecutionPolling, stopExecutionPolling])

  const runAllTests = async () => {
    if (tests.some(t => t.status === 'running')) {
      toast.error('A test is already running. Please wait for it to complete.')
      return
    }
    setRunningAll(true)
    // Run tests one at a time: await each runTest() which now waits for the test
    // to fully complete (passed/failed) before the loop advances.
    // This prevents concurrent browser resource contention.
    for (const test of testsRef.current) {
      if (test.status !== 'running') {
        await runTest(test.id)
        // Brief pause between tests for browser/OS resources to fully release.
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
    setRunningAll(false)
    toast.success('All tests completed!')
  }

  const resetTests = () => {
    pollingIntervalsRef.current.forEach((timer) => clearInterval(timer))
    pollingIntervalsRef.current.clear()
    unsubscribeRefs.current.forEach((fn) => fn?.())
    unsubscribeRefs.current.clear()
    // Resolve any pending completions so runAllTests loop exits cleanly.
    completionResolversRef.current.forEach((resolve) => resolve())
    completionResolversRef.current.clear()
    expectedExecutionIdRef.current.clear()
    runningGuardRef.current.clear()
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
                disabled={runningAll || tests.some(t => t.status === 'running')}
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
                    disabled={tests.some(t => t.status === 'running')}
                    title={tests.some(t => t.status === 'running') ? 'A test is already running. Please wait.' : 'Run test'}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
