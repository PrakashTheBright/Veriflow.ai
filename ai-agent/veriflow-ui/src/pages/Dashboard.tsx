import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Globe, Cpu, ArrowRight, Play, CheckCircle2, 
  XCircle, Clock, Activity, TrendingUp, Zap
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { api } from '../services/api'

interface DashboardStats {
  total: number
  passed: number
  failed: number
  pending: number
}

interface RecentTest {
  name: string
  status: string
  duration: string
  type: string
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

export default function Dashboard() {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    passed: 0,
    failed: 0,
    pending: 0
  })
  const [recentTests, setRecentTests] = useState<RecentTest[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch stats
        const statsData = await api.getReportStats()
        
        // Calculate pending tests (total - passed - failed)
        const pending = statsData.total - statsData.passed - statsData.failed
        
        setStats({
          total: statsData.total,
          passed: statsData.passed,
          failed: statsData.failed,
          pending: pending > 0 ? pending : 0
        })

        // Fetch recent tests (limit to 5 most recent)
        const reportsData = await api.getReports({ limit: 5, offset: 0 })
        
        const formattedTests = reportsData.reports.map(report => ({
          name: report.name,
          status: report.status,
          duration: report.duration ? `${(report.duration / 1000).toFixed(1)}s` : '-',
          type: report.type?.toUpperCase() || 'API'
        }))
        
        setRecentTests(formattedTests)
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
    
    // Refresh data every 60 seconds (reduced frequency to improve performance)
    const interval = setInterval(fetchDashboardData, 60000)
    
    return () => clearInterval(interval)
  }, [])

  const statsConfig = [
    { label: 'Total Tests', value: stats.total.toString(), icon: Activity, color: 'neon-blue' },
    { label: 'Passed', value: stats.passed.toString(), icon: CheckCircle2, color: 'neon-green' },
    { label: 'Failed', value: stats.failed.toString(), icon: XCircle, color: 'red-400' },
    { label: 'Pending', value: stats.pending.toString(), icon: Clock, color: 'yellow-400' },
  ]

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, <span className="gradient-text">{user?.username || 'User'}</span>
        </h1>
        <p className="text-dark-400">
          Here's an overview of your testing activities
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statsConfig.map((stat) => (
          <div
            key={stat.label}
            className="glass-card p-5 rounded-xl hover:scale-[1.02] transition-transform duration-300"
          >
            <div className="flex items-center justify-between mb-3">
              <stat.icon className={`w-5 h-5 text-${stat.color}`} />
              <TrendingUp className="w-4 h-4 text-neon-green" />
            </div>
            <p className="text-3xl font-bold text-white mb-1">
              {loading ? '...' : stat.value}
            </p>
            <p className="text-dark-400 text-sm">{stat.label}</p>
          </div>
        ))}
      </motion.div>

      {/* Testing Modules */}
      <motion.div variants={itemVariants}>
        <h2 className="text-xl font-semibold text-white mb-4">Testing Modules</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {/* UI Testing Card */}
          <Link to="/app/ui-testing" className="group">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              className="glass-card p-6 rounded-2xl neon-border relative overflow-hidden h-full"
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-neon-blue/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Animated Orb */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-neon-blue/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center">
                    <Globe className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-neon-blue group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">UI Testing</h3>
                <p className="text-dark-400 mb-4">
                  Execute browser-based UI tests with automated element detection and visual validation.
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-neon-green">
                    <CheckCircle2 className="w-4 h-4" /> 5 Tests Ready
                  </span>
                  <span className="flex items-center gap-1.5 text-dark-400">
                    <Play className="w-4 h-4" /> Auto-execute
                  </span>
                </div>
              </div>
            </motion.div>
          </Link>

          {/* API Testing Card */}
          <Link to="/app/api-testing" className="group">
            <motion.div
              whileHover={{ scale: 1.02, y: -5 }}
              className="glass-card p-6 rounded-2xl neon-border relative overflow-hidden h-full"
            >
              {/* Background Gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              {/* Animated Orb */}
              <div className="absolute -right-10 -top-10 w-40 h-40 bg-neon-purple/20 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
              
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center">
                    <Cpu className="w-7 h-7 text-white" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-dark-400 group-hover:text-neon-purple group-hover:translate-x-1 transition-all" />
                </div>
                
                <h3 className="text-2xl font-bold text-white mb-2">API Testing</h3>
                <p className="text-dark-400 mb-4">
                  Validate REST APIs with request/response validation, chaining, and E2E workflows.
                </p>
                
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1.5 text-neon-green">
                    <CheckCircle2 className="w-4 h-4" /> 5 Endpoints
                  </span>
                  <span className="flex items-center gap-1.5 text-dark-400">
                    <Zap className="w-4 h-4" /> Fast execution
                  </span>
                </div>
              </div>
            </motion.div>
          </Link>
        </div>
      </motion.div>

      {/* Recent Tests */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Test Executions</h2>
          <Link to="/app/reports" className="text-neon-blue hover:text-neon-cyan transition-colors text-sm flex items-center gap-1">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        
        <div className="glass-card rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-dark-400">Loading recent tests...</div>
          ) : recentTests.length === 0 ? (
            <div className="p-8 text-center text-dark-400">No test executions yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-dark-400 font-medium text-sm p-4">Test Name</th>
                  <th className="text-left text-dark-400 font-medium text-sm p-4">Type</th>
                  <th className="text-left text-dark-400 font-medium text-sm p-4">Status</th>
                  <th className="text-left text-dark-400 font-medium text-sm p-4">Duration</th>
                </tr>
              </thead>
              <tbody>
                {recentTests.map((test, i) => (
                  <motion.tr
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors"
                  >
                    <td className="p-4">
                      <span className="text-white font-medium">{test.name}</span>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        test.type === 'UI' 
                          ? 'bg-neon-blue/20 text-neon-blue' 
                          : 'bg-neon-purple/20 text-neon-purple'
                      }`}>
                        {test.type}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`status-badge ${
                        test.status === 'passed' ? 'status-passed' :
                        test.status === 'failed' ? 'status-failed' :
                        test.status === 'running' ? 'status-running' : 'status-pending'
                      }`}>
                        {test.status === 'running' && (
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse" />
                        )}
                        {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className="text-dark-400 font-mono text-sm">{test.duration}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
