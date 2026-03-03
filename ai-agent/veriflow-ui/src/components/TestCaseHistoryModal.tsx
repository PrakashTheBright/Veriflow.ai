import { useState, useEffect } from 'react'
import { X, History, Search, Eye, Edit, RefreshCw, Trash2, ChevronLeft, ChevronRight, FileText, Code, Calendar, Clock, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface TestCaseHistoryItem {
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

interface TestCaseHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  onLoadTestCases: (testCases: any[], testCaseName: string, testType: 'ui' | 'api') => void
}

const statusConfig = {
  generated: { icon: Clock, color: 'text-blue-400', bgColor: 'bg-blue-500/20', label: 'Generated' },
  edited: { icon: Edit, color: 'text-amber-400', bgColor: 'bg-amber-500/20', label: 'Edited' },
  approved: { icon: CheckCircle, color: 'text-emerald-400', bgColor: 'bg-emerald-500/20', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-400', bgColor: 'bg-red-500/20', label: 'Rejected' }
}

export default function TestCaseHistoryModal({ isOpen, onClose, onLoadTestCases }: TestCaseHistoryModalProps) {
  const [history, setHistory] = useState<TestCaseHistoryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [testTypeFilter, setTestTypeFilter] = useState<'all' | 'ui' | 'api'>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalItems, setTotalItems] = useState(0)
  const [selectedItem, setSelectedItem] = useState<TestCaseHistoryItem | null>(null)
  const [viewMode, setViewMode] = useState<'list' | 'detail'>('list')
  const itemsPerPage = 5

  useEffect(() => {
    if (isOpen) {
      fetchHistory()
    }
  }, [isOpen, currentPage, searchTerm, testTypeFilter, statusFilter])

  const fetchHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        search: searchTerm,
        testType: testTypeFilter,
        status: statusFilter,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
      
      const response = await fetch(`http://localhost:4000/api/testcase-history?${params}`)
      const data = await response.json()
      
      if (data.success) {
        setHistory(data.data)
        setTotalPages(data.pagination.totalPages)
        setTotalItems(data.pagination.total)
      }
    } catch (error) {
      console.error('Error fetching history:', error)
      toast.error('Failed to load history')
    } finally {
      setLoading(false)
    }
  }

  const handleView = (item: TestCaseHistoryItem) => {
    setSelectedItem(item)
    setViewMode('detail')
  }

  const handleLoad = (item: TestCaseHistoryItem) => {
    onLoadTestCases(item.testCases, item.testCaseName, item.testType)
    toast.success(`Loaded "${item.testCaseName}" (${item.testCases.length} test cases)`)
    onClose()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this history item?')) return
    
    try {
      const response = await fetch(`http://localhost:4000/api/testcase-history/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success('History item deleted')
        fetchHistory()
      } else {
        toast.error(data.message || 'Failed to delete')
      }
    } catch (error) {
      toast.error('Failed to delete history item')
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch(`http://localhost:4000/api/testcase-history/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Status updated to ${status}`)
        fetchHistory()
        if (selectedItem?.id === id) {
          setSelectedItem(data.data)
        }
      }
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl w-[95vw] max-w-6xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center">
              <History className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Test Case History</h2>
              <p className="text-sm text-gray-400">{totalItems} items saved</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {viewMode === 'list' ? (
          <>
            {/* Filters */}
            <div className="p-4 border-b border-gray-800 flex flex-wrap gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1) }}
                  className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              
              {/* Test Type Filter */}
              <select
                value={testTypeFilter}
                onChange={(e) => { setTestTypeFilter(e.target.value as any); setCurrentPage(1) }}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Types</option>
                <option value="ui">UI Tests</option>
                <option value="api">API Tests</option>
              </select>
              
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1) }}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="generated">Generated</option>
                <option value="edited">Edited</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              
              {/* Refresh */}
              <button
                onClick={fetchHistory}
                className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="flex items-center justify-center h-48">
                  <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                  <History className="w-12 h-12 mb-2 opacity-50" />
                  <p>No history found</p>
                  <p className="text-sm">Generated test cases will appear here</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-800">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Test Case Name</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Type</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Input</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Cases</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Status</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Created</th>
                      <th className="text-right px-3 py-2 text-xs font-semibold text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((item) => {
                      const StatusIcon = statusConfig[item.status].icon
                      return (
                        <tr key={item.id} className="border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors">
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                              <span className="text-white font-medium text-sm">{item.testCaseName}</span>
                              <span className="text-gray-500 text-xs font-mono">{item.id}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                              item.testType === 'ui' 
                                ? 'bg-cyan-500/20 text-cyan-400' 
                                : 'bg-purple-500/20 text-purple-400'
                            }`}>
                              {item.testType === 'ui' ? <FileText className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                              {item.testType.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-gray-400 text-sm capitalize">{item.inputSource}</span>
                            {item.inputFileName && (
                              <span className="block text-gray-500 text-xs truncate max-w-[150px]">{item.inputFileName}</span>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <span className="text-white font-medium">{item.testCases.length}</span>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig[item.status].bgColor} ${statusConfig[item.status].color}`}>
                              <StatusIcon className="w-3 h-3" />
                              {statusConfig[item.status].label}
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 text-gray-400 text-sm">
                              <Calendar className="w-3 h-3" />
                              {formatDate(item.createdAt)}
                            </div>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => handleView(item)}
                                className="p-1.5 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleLoad(item)}
                                className="p-1.5 hover:bg-emerald-600 bg-emerald-600/20 rounded-lg text-emerald-400 hover:text-white transition-colors"
                                title="Load Test Cases"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="p-1.5 hover:bg-red-600 rounded-lg text-gray-400 hover:text-white transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 border-t border-gray-800">
                <span className="text-sm text-gray-400">
                  Page {currentPage} of {totalPages} ({totalItems} items)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === page 
                            ? 'bg-cyan-600 text-white' 
                            : 'text-gray-400 hover:bg-gray-800'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          /* Detail View */
          <div className="flex-1 overflow-auto p-4">
            <button
              onClick={() => setViewMode('list')}
              className="flex items-center gap-2 text-gray-400 hover:text-white mb-4 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to List
            </button>
            
            {selectedItem && (
              <div className="space-y-4">
                {/* Header Info */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-white">{selectedItem.testCaseName}</h3>
                      <p className="text-gray-500 text-sm font-mono">{selectedItem.id}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoad(selectedItem)}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white text-sm font-medium flex items-center gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Load Test Cases
                      </button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-gray-500 text-xs uppercase mb-1">Type</p>
                      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium ${
                        selectedItem.testType === 'ui' 
                          ? 'bg-cyan-500/20 text-cyan-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {selectedItem.testType === 'ui' ? <FileText className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                        {selectedItem.testType.toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase mb-1">Status</p>
                      <select
                        value={selectedItem.status}
                        onChange={(e) => handleUpdateStatus(selectedItem.id, e.target.value)}
                        className="px-2 py-1 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                      >
                        <option value="generated">Generated</option>
                        <option value="edited">Edited</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase mb-1">Test Cases</p>
                      <p className="text-white font-medium">{selectedItem.testCases.length}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase mb-1">Version</p>
                      <p className="text-white font-medium">v{selectedItem.version}</p>
                    </div>
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-500 text-xs uppercase mb-1">Input Source</p>
                      <p className="text-white text-sm capitalize">{selectedItem.inputSource}</p>
                      {selectedItem.inputFileName && (
                        <p className="text-gray-400 text-xs">{selectedItem.inputFileName}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase mb-1">Created At</p>
                      <p className="text-white text-sm">{formatDate(selectedItem.createdAt)}</p>
                    </div>
                  </div>
                  
                  {selectedItem.inputDescription && (
                    <div className="mt-4">
                      <p className="text-gray-500 text-xs uppercase mb-1">Description</p>
                      <p className="text-gray-300 text-sm bg-gray-800 p-2 rounded">{selectedItem.inputDescription}</p>
                    </div>
                  )}
                </div>
                
                {/* Test Cases Preview */}
                <div className="bg-gray-800/50 rounded-xl p-4">
                  <h4 className="text-white font-semibold mb-3">Generated Test Cases ({selectedItem.testCases.length})</h4>
                  <div className="space-y-2 max-h-[300px] overflow-auto">
                    {selectedItem.testCases.map((tc, index) => (
                      <div key={index} className="bg-gray-900 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-300">{index + 1}</span>
                          <span className="text-cyan-400 font-mono text-sm">{tc.testCaseId || `TC_${index + 1}`}</span>
                        </div>
                        <p className="text-gray-300 text-sm">{tc.testCaseTitle || tc.apiName || 'Test Case'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
