import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

const router = Router()

// History file path
const HISTORY_FILE_PATH = path.join(__dirname, '../../.testcase-history.json')

// Initialize history file if it doesn't exist
function initHistoryFile() {
  if (!fs.existsSync(HISTORY_FILE_PATH)) {
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify({ history: [] }, null, 2))
  }
}

// Read history from file
function readHistory(): TestCaseHistoryItem[] {
  try {
    initHistoryFile()
    const data = fs.readFileSync(HISTORY_FILE_PATH, 'utf-8')
    const parsed = JSON.parse(data)
    return parsed.history || []
  } catch (error) {
    console.error('Error reading history file:', error)
    return []
  }
}

// Write history to file
function writeHistory(history: TestCaseHistoryItem[]) {
  try {
    fs.writeFileSync(HISTORY_FILE_PATH, JSON.stringify({ history }, null, 2))
  } catch (error) {
    console.error('Error writing history file:', error)
  }
}

export interface TestCaseHistoryItem {
  id: string
  testCaseName: string
  testType: 'ui' | 'api'
  inputSource: 'description' | 'file' | 'both'
  inputFileName?: string
  inputDescription?: string
  testCases: any[]
  selectedFields: string[]
  status: 'generated' | 'edited' | 'approved' | 'rejected'
  createdBy: string
  createdAt: string
  updatedAt: string
  version: number
}

// Generate unique ID
function generateId(): string {
  return `TC_HIST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Get all history with pagination, search, and filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search = '',
      testType = '',
      status = '',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query as Record<string, string>

    let history = readHistory()

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase()
      history = history.filter(item =>
        item.testCaseName.toLowerCase().includes(searchLower) ||
        item.id.toLowerCase().includes(searchLower)
      )
    }

    // Apply test type filter
    if (testType && testType !== 'all') {
      history = history.filter(item => item.testType === testType)
    }

    // Apply status filter
    if (status && status !== 'all') {
      history = history.filter(item => item.status === status)
    }

    // Sort
    history.sort((a, b) => {
      const aVal = a[sortBy as keyof TestCaseHistoryItem] ?? ''
      const bVal = b[sortBy as keyof TestCaseHistoryItem] ?? ''
      if (sortOrder === 'desc') {
        return aVal > bVal ? -1 : 1
      }
      return aVal > bVal ? 1 : -1
    })

    // Pagination
    const pageNum = parseInt(page)
    const limitNum = parseInt(limit)
    const startIndex = (pageNum - 1) * limitNum
    const endIndex = startIndex + limitNum
    const paginatedHistory = history.slice(startIndex, endIndex)

    res.json({
      success: true,
      data: paginatedHistory,
      pagination: {
        total: history.length,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(history.length / limitNum)
      }
    })
  } catch (error: any) {
    console.error('Error fetching history:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get single history item by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const history = readHistory()
    const item = history.find(h => h.id === id)

    if (!item) {
      return res.status(404).json({ success: false, message: 'History item not found' })
    }

    res.json({ success: true, data: item })
  } catch (error: any) {
    console.error('Error fetching history item:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Save new history item (called after generating test cases)
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      testCaseName,
      testType,
      inputSource,
      inputFileName,
      inputDescription,
      testCases,
      selectedFields,
      createdBy = 'System'
    } = req.body

    if (!testCaseName || !testType || !testCases) {
      return res.status(400).json({ 
        success: false, 
        message: 'testCaseName, testType, and testCases are required' 
      })
    }

    const history = readHistory()
    
    const newItem: TestCaseHistoryItem = {
      id: generateId(),
      testCaseName,
      testType,
      inputSource: inputSource || 'description',
      inputFileName,
      inputDescription: inputDescription?.substring(0, 500), // Store first 500 chars
      testCases,
      selectedFields: selectedFields || [],
      status: 'generated',
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1
    }

    history.unshift(newItem) // Add to beginning
    
    // Keep only last 100 items
    const trimmedHistory = history.slice(0, 100)
    writeHistory(trimmedHistory)

    res.json({ success: true, data: newItem })
  } catch (error: any) {
    console.error('Error saving history:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Update history item (edit, approve, reject)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params
    const { status, testCases } = req.body

    const history = readHistory()
    const index = history.findIndex(h => h.id === id)

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'History item not found' })
    }

    // Update fields
    if (status) history[index].status = status
    if (testCases) {
      history[index].testCases = testCases
      history[index].version += 1
    }
    history[index].updatedAt = new Date().toISOString()

    writeHistory(history)

    res.json({ success: true, data: history[index] })
  } catch (error: any) {
    console.error('Error updating history:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Delete history item
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const history = readHistory()
    const index = history.findIndex(h => h.id === id)

    if (index === -1) {
      return res.status(404).json({ success: false, message: 'History item not found' })
    }

    history.splice(index, 1)
    writeHistory(history)

    res.json({ success: true, message: 'History item deleted successfully' })
  } catch (error: any) {
    console.error('Error deleting history:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

// Get statistics
router.get('/stats/summary', async (req: Request, res: Response) => {
  try {
    const history = readHistory()

    const stats = {
      total: history.length,
      byType: {
        ui: history.filter(h => h.testType === 'ui').length,
        api: history.filter(h => h.testType === 'api').length
      },
      byStatus: {
        generated: history.filter(h => h.status === 'generated').length,
        edited: history.filter(h => h.status === 'edited').length,
        approved: history.filter(h => h.status === 'approved').length,
        rejected: history.filter(h => h.status === 'rejected').length
      },
      recentActivity: history.slice(0, 5).map(h => ({
        id: h.id,
        name: h.testCaseName,
        createdAt: h.createdAt
      }))
    }

    res.json({ success: true, data: stats })
  } catch (error: any) {
    console.error('Error fetching stats:', error)
    res.status(500).json({ success: false, message: error.message })
  }
})

export default router
