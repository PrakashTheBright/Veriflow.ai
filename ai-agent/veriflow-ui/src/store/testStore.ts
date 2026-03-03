import { create } from 'zustand'

export type TestStatus = 'pending' | 'running' | 'passed' | 'failed'

export interface TestCase {
  id: string
  name: string
  fileName: string
  type: 'ui' | 'api'
  status: TestStatus
  duration?: number
  error?: string
  reportPath?: string
  startedAt?: Date
  completedAt?: Date
}

export interface TestExecution {
  id: string
  testCaseId: string
  status: TestStatus
  progress: number
  logs: string[]
  startedAt: Date
  completedAt?: Date
}

interface TestState {
  testCases: TestCase[]
  activeExecutions: Map<string, TestExecution>
  isLoading: boolean
  error: string | null
  
  setTestCases: (testCases: TestCase[]) => void
  updateTestStatus: (id: string, status: TestStatus, data?: Partial<TestCase>) => void
  startExecution: (testCaseId: string) => void
  updateExecution: (executionId: string, data: Partial<TestExecution>) => void
  completeExecution: (executionId: string, status: TestStatus) => void
  fetchUITestCases: () => Promise<void>
  fetchAPITestCases: () => Promise<void>
  executeTest: (testCaseId: string) => Promise<void>
}

export const useTestStore = create<TestState>((set, get) => ({
  testCases: [],
  activeExecutions: new Map(),
  isLoading: false,
  error: null,

  setTestCases: (testCases) => set({ testCases }),

  updateTestStatus: (id, status, data) => {
    set((state) => ({
      testCases: state.testCases.map((tc) =>
        tc.id === id ? { ...tc, status, ...data } : tc
      ),
    }))
  },

  startExecution: (testCaseId) => {
    const execution: TestExecution = {
      id: `exec-${Date.now()}`,
      testCaseId,
      status: 'running',
      progress: 0,
      logs: [],
      startedAt: new Date(),
    }
    set((state) => {
      const newMap = new Map(state.activeExecutions)
      newMap.set(execution.id, execution)
      return { activeExecutions: newMap }
    })
  },

  updateExecution: (executionId, data) => {
    set((state) => {
      const newMap = new Map(state.activeExecutions)
      const existing = newMap.get(executionId)
      if (existing) {
        newMap.set(executionId, { ...existing, ...data })
      }
      return { activeExecutions: newMap }
    })
  },

  completeExecution: (executionId, status) => {
    set((state) => {
      const newMap = new Map(state.activeExecutions)
      const existing = newMap.get(executionId)
      if (existing) {
        newMap.set(executionId, {
          ...existing,
          status,
          progress: 100,
          completedAt: new Date(),
        })
      }
      return { activeExecutions: newMap }
    })
  },

  fetchUITestCases: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/tests/ui')
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      set({ testCases: data.testCases, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch test cases',
        isLoading: false,
      })
    }
  },

  fetchAPITestCases: async () => {
    set({ isLoading: true, error: null })
    try {
      const response = await fetch('/api/tests/api')
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
      set({ testCases: data.testCases, isLoading: false })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch test cases',
        isLoading: false,
      })
    }
  },

  executeTest: async (testCaseId) => {
    const { updateTestStatus, startExecution } = get()
    updateTestStatus(testCaseId, 'running', { startedAt: new Date() })
    startExecution(testCaseId)

    try {
      const response = await fetch('/api/tests/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testCaseId }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message)
    } catch (error) {
      updateTestStatus(testCaseId, 'failed', {
        error: error instanceof Error ? error.message : 'Execution failed',
      })
    }
  },
}))
