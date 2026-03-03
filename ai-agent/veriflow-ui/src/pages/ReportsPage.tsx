import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Eye, Download, Trash2, Calendar, Clock,
  CheckCircle2, XCircle, Filter, Search, ExternalLink, Loader2, X,
  BarChart3, Activity, Play, StopCircle
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'

interface Report {
  id: string
  name: string
  testType: 'ui' | 'api'
  status: 'passed' | 'failed'
  passRate: number
  totalActions: number
  passedActions: number
  failedActions: number
  duration: number
  startedAt: string
  completedAt: string
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

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ total: 0, passed: 0, failed: 0, avgPassRate: 0 })
  const [filter, setFilter] = useState<'all' | 'ui' | 'api'>('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalReports, setTotalReports] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const reportsPerPage = 10

  // Debounce search to reduce API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput)
      setCurrentPage(1)
    }, 500)
    return () => clearTimeout(timer)
  }, [searchInput])

  // Load reports on mount and when filters change
  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true)
      try {
        const offset = (currentPage - 1) * reportsPerPage
        const [reportsData, statsData] = await Promise.all([
          api.getReports({
            type: filter !== 'all' ? filter : undefined,
            status: statusFilter !== 'all' ? statusFilter : undefined,
            search: searchQuery || undefined,
            limit: reportsPerPage,
            offset: offset
          }),
          api.getReportStats(),
        ])
        setReports(reportsData.reports)
        setTotalReports(reportsData.pagination?.total || reportsData.reports.length)
        setStats(statsData)
      } catch (error) {
        console.error('Failed to fetch reports:', error)
        toast.error('Failed to load reports')
      } finally {
        setLoading(false)
      }
    }
    fetchReports()
  }, [currentPage, filter, statusFilter, searchQuery])

  const totalPages = Math.ceil(totalReports / reportsPerPage)
  
  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  
  const handleFilterChange = (newFilter: typeof filter) => {
    setFilter(newFilter)
    setCurrentPage(1)
  }
  
  const handleStatusFilterChange = (newStatus: typeof statusFilter) => {
    setStatusFilter(newStatus)
    setCurrentPage(1)
  }
  
  const handleSearchInputChange = (query: string) => {
    setSearchInput(query)
  }

  const viewReport = async (report: Report) => {
    try {
      const html = await api.viewReport(report.id)
      const newWindow = window.open()
      if (newWindow) {
        newWindow.document.write(html)
        newWindow.document.close()
      }
    } catch (error) {
      toast.error('Failed to open report')
    }
  }

  const downloadReport = async (report: Report) => {
    try {
      await api.downloadReport(report.id)
      toast.success(`Downloaded ${report.name}`)
    } catch (error) {
      toast.error('Failed to download report')
    }
  }

  const deleteReport = async (reportId: string) => {
    try {
      await api.deleteReport(reportId)
      setReports((prev) => prev.filter((r) => r.id !== reportId))
      toast.success('Report deleted')
    } catch (error) {
      toast.error('Failed to delete report')
    }
  }

  const formatDuration = (ms: number) => {
    if (!ms) return 'N/A'
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A'
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-neon-green animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading reports...</p>
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
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white">Reports</h1>
          </div>
          <p className="text-dark-400">
            View and download test execution reports
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[300px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search reports..."
            className="input-field pl-12"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2 bg-dark-800/50 rounded-xl p-1">
          {(['all', 'ui', 'api'] as const).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterChange(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === type
                  ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white'
                  : 'text-dark-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {type === 'all' ? 'All Types' : type.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2 bg-dark-800/50 rounded-xl p-1">
          {(['all', 'passed', 'failed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                statusFilter === status
                  ? status === 'passed' ? 'bg-green-500/20 text-green-400' :
                    status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    'bg-gradient-to-r from-neon-blue to-neon-purple text-white'
                  : 'text-dark-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Reports', value: stats.total, color: 'neon-blue' },
          { label: 'Passed', value: stats.passed, color: 'neon-green' },
          { label: 'Failed', value: stats.failed, color: 'red-400' },
          { label: 'Avg Pass Rate', value: `${stats.avgPassRate}%`, color: 'neon-cyan' },
        ].map((stat) => (
          <div key={stat.label} className="glass-card p-4 rounded-xl text-center">
            <p className={`text-2xl font-bold text-${stat.color}`}>{stat.value}</p>
            <p className="text-dark-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Reports List */}
      <motion.div variants={itemVariants} className="space-y-4">
        {reports.length === 0 ? (
          <div className="glass-card p-12 rounded-xl text-center">
            <FileText className="w-12 h-12 text-dark-500 mx-auto mb-4" />
            <p className="text-dark-400">No reports found</p>
          </div>
        ) : (
          reports.map((report) => (
            <motion.div
              key={report.id}
              layout
              className="glass-card rounded-xl p-5 hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {report.status === 'passed' ? (
                    <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                      <XCircle className="w-6 h-6 text-red-400" />
                    </div>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">{report.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-dark-400">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        report.testType === 'ui' 
                          ? 'bg-neon-blue/20 text-neon-blue' 
                          : 'bg-neon-purple/20 text-neon-purple'
                      }`}>
                        {report.testType?.toUpperCase()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {formatDate(report.completedAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatDuration(report.duration)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  {/* Test Stats */}
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{report.passRate}%</p>
                      <p className="text-dark-400 text-xs">Pass Rate</p>
                    </div>
                    <div className="h-10 w-px bg-white/10" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-neon-green">{report.passedActions || 0}</p>
                      <p className="text-dark-400 text-xs">Passed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-semibold text-red-400">{report.failedActions || 0}</p>
                      <p className="text-dark-400 text-xs">Failed</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedReport(report)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-neon-cyan"
                      title="View Summary"
                    >
                      <BarChart3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => viewReport(report)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-neon-blue"
                      title="Open Full Report"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => downloadReport(report)}
                      className="p-2 rounded-lg hover:bg-white/10 transition-colors text-neon-green"
                      title="Download Report"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deleteReport(report.id)}
                      className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-dark-400 hover:text-red-400"
                      title="Delete Report"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-4">
                <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-neon-green to-neon-cyan"
                    style={{ width: `${report.passRate}%` }}
                  />
                </div>
              </div>
            </motion.div>
          ))
        )}
      </motion.div>

      {/* Pagination */}
      {totalPages > 1 && (
        <motion.div variants={itemVariants} className="flex items-center justify-center gap-2 mt-8">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-4 py-2 rounded-lg bg-dark-800/50 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (currentPage <= 3) {
                pageNum = i + 1
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = currentPage - 2 + i
              }
              
              return (
                <button
                  key={pageNum}
                  onClick={() => handlePageChange(pageNum)}
                  className={`w-10 h-10 rounded-lg font-medium transition-all ${
                    currentPage === pageNum
                      ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-white'
                      : 'bg-dark-800/50 text-dark-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  {pageNum}
                </button>
              )
            })}
          </div>
          
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-4 py-2 rounded-lg bg-dark-800/50 text-white hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
          
          <span className="ml-4 text-dark-400 text-sm">
            Page {currentPage} of {totalPages} • Total: {totalReports} reports
          </span>
        </motion.div>
      )}

      {/* Report Summary Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-800 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                    selectedReport.status === 'passed'
                      ? 'bg-green-500/20'
                      : 'bg-red-500/20'
                  }`}>
                    {selectedReport.status === 'passed' ? (
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    ) : (
                      <XCircle className="w-6 h-6 text-red-400" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">{selectedReport.name}</h2>
                    <p className="text-dark-400 text-sm">Report Summary</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedReport(null)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors text-dark-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                {/* Key Metrics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-neon-blue" />
                      <p className="text-dark-400 text-sm">Status</p>
                    </div>
                    <p className={`text-xl font-bold ${
                      selectedReport.status === 'passed' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {selectedReport.status.toUpperCase()}
                    </p>
                  </div>

                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-neon-purple" />
                      <p className="text-dark-400 text-sm">Pass Rate</p>
                    </div>
                    <p className="text-xl font-bold text-neon-cyan">
                      {selectedReport.passRate}%
                    </p>
                  </div>

                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-neon-green" />
                      <p className="text-dark-400 text-sm">Duration</p>
                    </div>
                    <p className="text-xl font-bold text-white">
                      {formatDuration(selectedReport.duration)}
                    </p>
                  </div>

                  <div className="glass-card p-4 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 text-neon-yellow" />
                      <p className="text-dark-400 text-sm">Type</p>
                    </div>
                    <p className="text-xl font-bold text-white uppercase">
                      {selectedReport.testType}
                    </p>
                  </div>
                </div>

                {/* Actions Summary */}
                <div className="glass-card p-6 rounded-xl mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-neon-blue" />
                    Actions Summary
                  </h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-dark-700/50 rounded-lg">
                      <p className="text-3xl font-bold text-white mb-1">
                        {selectedReport.totalActions}
                      </p>
                      <p className="text-dark-400 text-sm">Total Actions</p>
                    </div>
                    <div className="text-center p-4 bg-green-500/10 rounded-lg">
                      <p className="text-3xl font-bold text-green-400 mb-1">
                        {selectedReport.passedActions}
                      </p>
                      <p className="text-dark-400 text-sm">Passed</p>
                    </div>
                    <div className="text-center p-4 bg-red-500/10 rounded-lg">
                      <p className="text-3xl font-bold text-red-400 mb-1">
                        {selectedReport.failedActions}
                      </p>
                      <p className="text-dark-400 text-sm">Failed</p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-sm text-dark-400 mb-2">
                      <span>Test Progress</span>
                      <span>{selectedReport.passRate}% Complete</span>
                    </div>
                    <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-neon-green to-neon-cyan transition-all duration-500"
                        style={{ width: `${selectedReport.passRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Execution Timeline */}
                <div className="glass-card p-6 rounded-xl mb-6">
                  <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-neon-purple" />
                    Execution Timeline
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-neon-blue/20 flex items-center justify-center">
                        <Play className="w-5 h-5 text-neon-blue" />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Test Started</p>
                        <p className="text-dark-400 text-sm">{formatDate(selectedReport.startedAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                        selectedReport.status === 'passed' ? 'bg-green-500/20' : 'bg-red-500/20'
                      }`}>
                        <StopCircle className={`w-5 h-5 ${
                          selectedReport.status === 'passed' ? 'text-green-400' : 'text-red-400'
                        }`} />
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">Test Completed</p>
                        <p className="text-dark-400 text-sm">{formatDate(selectedReport.completedAt)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      viewReport(selectedReport)
                      setSelectedReport(null)
                    }}
                    className="flex-1 btn-secondary py-3 flex items-center justify-center gap-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    View Full Report
                  </button>
                  <button
                    onClick={() => {
                      downloadReport(selectedReport)
                      setSelectedReport(null)
                    }}
                    className="flex-1 btn-primary py-3 flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download Report
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
