import { Router, Request } from 'express'
import path from 'path'
import fs from 'fs/promises'
import pool from '../database/init'
import { cleanupOldReports, cleanupKeepRecent, cleanupOrphanedFiles } from '../utils/cleanup'

// Extend Request to include user info from auth middleware
interface AuthRequest extends Request {
  user?: {
    id: string
    username: string
    email: string
    role: string
  }
}

const router = Router()

// Get all reports
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { type, status, search, dateFrom, dateTo, limit = '50', offset = '0' } = req.query
    
    // Check if user is admin - admins see all reports, non-admins see only their own
    const isAdmin = req.user?.role === 'admin'
    const userId = req.user?.id
    
    let query = `
      SELECT 
        te.id,
        te.test_name,
        te.test_type,
        te.status,
        te.duration,
        te.total_actions,
        te.passed_actions,
        te.failed_actions,
        te.report_path,
        te.started_at,
        te.completed_at
      FROM test_executions te
      WHERE te.completed_at IS NOT NULL
    `
    const params: any[] = []
    let paramIndex = 1

    // Filter by user_id for non-admin users
    if (!isAdmin && userId) {
      query += ` AND te.user_id = $${paramIndex++}`
      params.push(userId)
    }

    if (type && type !== 'all') {
      query += ` AND te.test_type = $${paramIndex++}`
      params.push(type)
    }

    if (status && status !== 'all') {
      query += ` AND te.status = $${paramIndex++}`
      params.push(status)
    }

    if (search) {
      query += ` AND te.test_name ILIKE $${paramIndex++}`
      params.push(`%${search}%`)
    }

    if (dateFrom) {
      query += ` AND te.started_at >= $${paramIndex++}`
      params.push(dateFrom)
    }

    if (dateTo) {
      query += ` AND te.started_at <= $${paramIndex++}`
      params.push(dateTo)
    }

    query += ' ORDER BY te.completed_at DESC'
    
    // Add pagination with LIMIT and OFFSET
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
    params.push(parseInt(limit as string) || 50, parseInt(offset as string) || 0)

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM test_executions te WHERE te.completed_at IS NOT NULL'
    const countParams: any[] = []
    let countIndex = 1
    
    // Filter count by user_id for non-admin users
    if (!isAdmin && userId) {
      countQuery += ` AND te.user_id = $${countIndex++}`
      countParams.push(userId)
    }
    
    if (type && type !== 'all') {
      countQuery += ` AND te.test_type = $${countIndex++}`
      countParams.push(type)
    }
    if (status && status !== 'all') {
      countQuery += ` AND te.status = $${countIndex++}`
      countParams.push(status)
    }
    if (search) {
      countQuery += ` AND te.test_name ILIKE $${countIndex++}`
      countParams.push(`%${search}%`)
    }
    if (dateFrom) {
      countQuery += ` AND te.started_at >= $${countIndex++}`
      countParams.push(dateFrom)
    }
    if (dateTo) {
      countQuery += ` AND te.started_at <= $${countIndex++}`
      countParams.push(dateTo)
    }

    const [result, countResult] = await Promise.all([
      pool.query(query, params),
      pool.query(countQuery, countParams)
    ])

    // Transform the data for frontend
    const reports = result.rows.map((row) => ({
      id: row.id,
      name: row.test_name,
      type: row.test_type,
      status: row.status,
      duration: row.duration,
      totalActions: row.total_actions,
      passedActions: row.passed_actions,
      failedActions: row.failed_actions,
      reportPath: row.report_path,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      passRate: row.total_actions > 0 
        ? Math.round((row.passed_actions / row.total_actions) * 100) 
        : 0,
    }))

    const total = parseInt(countResult.rows[0]?.total || '0')
    const currentLimit = parseInt(limit as string) || 50
    const currentOffset = parseInt(offset as string) || 0

    res.json({ 
      reports,
      pagination: {
        total,
        limit: currentLimit,
        offset: currentOffset,
        hasMore: currentOffset + currentLimit < total
      }
    })
  } catch (error) {
    console.error('Error fetching reports:', error)
    res.status(500).json({ message: 'Failed to fetch reports' })
  }
})

// Get report statistics
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    // Check if user is admin - admins see all stats, non-admins see only their own
    const isAdmin = req.user?.role === 'admin'
    const userId = req.user?.id
    
    let query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'passed') as passed,
        COUNT(*) FILTER (WHERE status = 'failed') as failed,
        COUNT(*) FILTER (WHERE test_type = 'ui') as ui_tests,
        COUNT(*) FILTER (WHERE test_type = 'api') as api_tests,
        AVG(duration) as avg_duration,
        AVG(CASE WHEN total_actions > 0 
            THEN (passed_actions::float / total_actions * 100) 
            ELSE 0 END) as avg_pass_rate
      FROM test_executions
      WHERE completed_at IS NOT NULL
    `
    
    const params: any[] = []
    
    // Filter by user_id for non-admin users
    if (!isAdmin && userId) {
      query += ` AND user_id = $1`
      params.push(userId)
    }
    
    const result = await pool.query(query, params)

    const stats = result.rows[0]

    res.json({
      total: parseInt(stats.total) || 0,
      passed: parseInt(stats.passed) || 0,
      failed: parseInt(stats.failed) || 0,
      uiTests: parseInt(stats.ui_tests) || 0,
      apiTests: parseInt(stats.api_tests) || 0,
      avgDuration: Math.round(parseFloat(stats.avg_duration) || 0),
      avgPassRate: Math.round(parseFloat(stats.avg_pass_rate) || 0),
    })
  } catch (error) {
    console.error('Error fetching report stats:', error)
    res.status(500).json({ message: 'Failed to fetch statistics' })
  }
})

// View HTML report
router.get('/:id/view', async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'SELECT report_path, test_name FROM test_executions WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' })
    }

    const { report_path, test_name } = result.rows[0]

    if (!report_path) {
      // Generate a basic report if path is missing
      const execution = await pool.query(
        'SELECT * FROM test_executions WHERE id = $1',
        [id]
      )
      const exec = execution.rows[0]

      const htmlReport = generateBasicReport(exec)
      res.setHeader('Content-Type', 'text/html')
      return res.send(htmlReport)
    }

    // Read and serve the report
    const reportContent = await fs.readFile(report_path, 'utf-8')
    res.setHeader('Content-Type', 'text/html')
    res.send(reportContent)
  } catch (error) {
    console.error('Error viewing report:', error)
    res.status(500).json({ message: 'Failed to load report' })
  }
})

// Download report
router.get('/:id/download', async (req, res) => {
  try {
    const { id } = req.params
    
    const result = await pool.query(
      'SELECT report_path, test_name FROM test_executions WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' })
    }

    const { report_path, test_name } = result.rows[0]
    const fileName = `${test_name.replace(/\s+/g, '_')}_report.html`

    if (!report_path) {
      const execution = await pool.query(
        'SELECT * FROM test_executions WHERE id = $1',
        [id]
      )
      const htmlReport = generateBasicReport(execution.rows[0])
      
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      return res.send(htmlReport)
    }

    // Read and send the file
    try {
      const reportContent = await fs.readFile(report_path, 'utf-8')
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.send(reportContent)
    } catch (fileError) {
      console.error('Error reading report file:', fileError)
      // Fall back to generating basic report
      const execution = await pool.query(
        'SELECT * FROM test_executions WHERE id = $1',
        [id]
      )
      const htmlReport = generateBasicReport(execution.rows[0])
      res.setHeader('Content-Type', 'text/html')
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
      res.send(htmlReport)
    }
  } catch (error) {
    console.error('Error downloading report:', error)
    res.status(500).json({ message: 'Failed to download report' })
  }
})

// Delete report
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    // Get report path first
    const result = await pool.query(
      'SELECT report_path FROM test_executions WHERE id = $1',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Report not found' })
    }

    const { report_path } = result.rows[0]

    // Delete from database
    await pool.query('DELETE FROM test_executions WHERE id = $1', [id])

    // Delete file if exists
    if (report_path) {
      try {
        await fs.unlink(report_path)
      } catch {
        // File might not exist, ignore
      }
    }

    res.json({ success: true, message: 'Report deleted successfully' })
  } catch (error) {
    console.error('Error deleting report:', error)
    res.status(500).json({ message: 'Failed to delete report' })
  }
})

// Helper function to generate basic HTML report
function generateBasicReport(execution: any): string {
  const statusColor = execution.status === 'passed' ? '#10b981' : '#ef4444'
  const duration = execution.duration 
    ? `${(execution.duration / 1000).toFixed(2)}s` 
    : 'N/A'

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>VeriFlow AI - Test Report</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #0a0a0f 100%);
      color: #fff;
      min-height: 100vh;
      padding: 40px;
    }
    .container {
      max-width: 900px;
      margin: 0 auto;
    }
    .header {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 16px;
      padding: 30px;
      margin-bottom: 30px;
    }
    .logo {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .logo-icon {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #00d4ff, #a855f7);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }
    .logo-text {
      font-size: 24px;
      font-weight: bold;
      background: linear-gradient(90deg, #00d4ff, #a855f7);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .test-type {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      text-transform: uppercase;
      background: ${execution.test_type === 'ui' ? 'rgba(0, 212, 255, 0.2)' : 'rgba(168, 85, 247, 0.2)'};
      color: ${execution.test_type === 'ui' ? '#00d4ff' : '#a855f7'};
      border: 1px solid ${execution.test_type === 'ui' ? 'rgba(0, 212, 255, 0.3)' : 'rgba(168, 85, 247, 0.3)'};
    }
    .status-badge {
      display: inline-block;
      padding: 8px 20px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      background: ${execution.status === 'passed' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'};
      color: ${statusColor};
      border: 1px solid ${execution.status === 'passed' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'};
      margin-top: 15px;
    }
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .stat-card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
    }
    .stat-label {
      color: #888;
      font-size: 14px;
      margin-bottom: 5px;
    }
    .stat-value {
      font-size: 24px;
      font-weight: bold;
    }
    .pass-rate {
      color: ${statusColor};
    }
    .timeline {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 20px;
    }
    .timeline h2 {
      margin-bottom: 20px;
      font-size: 18px;
    }
    .timeline-item {
      display: flex;
      gap: 15px;
      padding: 15px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }
    .timeline-item:last-child {
      border-bottom: none;
    }
    .timeline-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: ${statusColor};
      margin-top: 5px;
    }
    .timeline-content {
      flex: 1;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      color: #666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <div class="logo-icon">V</div>
        <span class="logo-text">VeriFlow AI</span>
      </div>
      <h1>${execution.test_name}</h1>
      <span class="test-type">${execution.test_type} Test</span>
      <div class="status-badge">${execution.status.toUpperCase()}</div>
    </div>

    <div class="stats">
      <div class="stat-card">
        <div class="stat-label">Duration</div>
        <div class="stat-value">${duration}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Actions</div>
        <div class="stat-value">${execution.total_actions || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Passed</div>
        <div class="stat-value" style="color: #10b981">${execution.passed_actions || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value" style="color: #ef4444">${execution.failed_actions || 0}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Pass Rate</div>
        <div class="stat-value pass-rate">
          ${execution.total_actions > 0 
            ? Math.round((execution.passed_actions / execution.total_actions) * 100) 
            : 0}%
        </div>
      </div>
    </div>

    <div class="timeline">
      <h2>Execution Timeline</h2>
      <div class="timeline-item">
        <div class="timeline-dot" style="background: #00d4ff"></div>
        <div class="timeline-content">
          <div>Test Started</div>
          <div style="color: #888; font-size: 14px">
            ${new Date(execution.started_at).toLocaleString()}
          </div>
        </div>
      </div>
      <div class="timeline-item">
        <div class="timeline-dot"></div>
        <div class="timeline-content">
          <div>Test ${execution.status === 'passed' ? 'Completed' : 'Failed'}</div>
          <div style="color: #888; font-size: 14px">
            ${execution.completed_at ? new Date(execution.completed_at).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>

    <div class="footer">
      Generated by VeriFlow AI • ${new Date().toLocaleDateString()}
    </div>
  </div>
</body>
</html>
  `
}

// Cleanup old reports
router.post('/cleanup', async (req, res) => {
  try {
    const { mode = 'keep-recent', daysToKeep = 30, keepCount = 50 } = req.body
    
    let result
    if (mode === 'by-date') {
      result = await cleanupOldReports(daysToKeep)
    } else if (mode === 'orphaned') {
      result = await cleanupOrphanedFiles()
    } else {
      result = await cleanupKeepRecent(keepCount)
    }
    
    res.json({ 
      success: true, 
      message: `Cleanup completed: ${'recordsRemoved' in result ? result.recordsRemoved : result.deleted} items removed`,
      ...result 
    })
  } catch (error) {
    console.error('Error during cleanup:', error)
    res.status(500).json({ message: 'Failed to cleanup reports' })
  }
})

export default router
