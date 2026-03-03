import fs from 'fs/promises'
import path from 'path'
import pool from '../database/init'

/**
 * Cleanup old test reports and database records
 * @param daysToKeep - Number of days to keep reports (default: 30)
 */
export async function cleanupOldReports(daysToKeep: number = 30) {
  try {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
    
    console.log(`🧹 Cleaning up reports older than ${daysToKeep} days (before ${cutoffDate.toISOString()})`)

    // Get old reports from database
    const result = await pool.query(
      `SELECT id, report_path FROM test_executions 
       WHERE completed_at < $1 AND report_path IS NOT NULL`,
      [cutoffDate]
    )

    if (result.rows.length === 0) {
      console.log('✓ No old reports to clean up')
      return { deleted: 0, failed: 0 }
    }

    let deletedFiles = 0
    let failedFiles = 0
    const reportIds = []

    // Delete report files
    for (const row of result.rows) {
      try {
        if (row.report_path) {
          const reportPath = path.resolve(__dirname, '../../../', row.report_path)
          
          // Delete HTML report
          try {
            await fs.unlink(reportPath)
            deletedFiles++
          } catch (err) {
            // File might already be deleted
          }

          // Delete corresponding JSON file
          const jsonPath = reportPath.replace('.html', '.json')
          try {
            await fs.unlink(jsonPath)
          } catch (err) {
            // JSON file might not exist
          }
        }
        reportIds.push(row.id)
      } catch (error) {
        console.error(`Failed to delete report file: ${row.report_path}`, error)
        failedFiles++
      }
    }

    // Delete database records
    if (reportIds.length > 0) {
      await pool.query(
        `DELETE FROM test_executions WHERE id = ANY($1)`,
        [reportIds]
      )
    }

    console.log(`✓ Cleanup completed: ${deletedFiles} files deleted, ${reportIds.length} database records removed`)
    
    return {
      deleted: deletedFiles,
      failed: failedFiles,
      recordsRemoved: reportIds.length
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
    throw error
  }
}

/**
 * Cleanup reports keeping only the most recent N reports
 * @param keepCount - Number of most recent reports to keep (default: 100)
 */
export async function cleanupKeepRecent(keepCount: number = 100) {
  try {
    console.log(`🧹 Keeping only ${keepCount} most recent reports`)

    // Get old reports (beyond the keep count)
    const result = await pool.query(
      `SELECT id, report_path FROM test_executions 
       WHERE completed_at IS NOT NULL
       ORDER BY completed_at DESC
       OFFSET $1`,
      [keepCount]
    )

    if (result.rows.length === 0) {
      console.log('✓ No excess reports to clean up')
      return { deleted: 0, recordsRemoved: 0 }
    }

    let deletedFiles = 0
    const reportIds = []

    // Delete report files
    for (const row of result.rows) {
      try {
        if (row.report_path) {
          const reportPath = path.resolve(__dirname, '../../../', row.report_path)
          
          // Delete HTML report
          try {
            await fs.unlink(reportPath)
            deletedFiles++
          } catch (err) {
            // File might already be deleted
          }

          // Delete corresponding JSON file
          const jsonPath = reportPath.replace('.html', '.json')
          try {
            await fs.unlink(jsonPath)
          } catch (err) {
            // JSON file might not exist
          }
        }
        reportIds.push(row.id)
      } catch (error) {
        console.error(`Failed to delete report file: ${row.report_path}`, error)
      }
    }

    // Delete database records
    if (reportIds.length > 0) {
      await pool.query(
        `DELETE FROM test_executions WHERE id = ANY($1)`,
        [reportIds]
      )
    }

    console.log(`✓ Cleanup completed: ${deletedFiles} files deleted, ${reportIds.length} database records removed`)
    console.log(`✓ Keeping ${keepCount} most recent reports`)
    
    return {
      deleted: deletedFiles,
      recordsRemoved: reportIds.length
    }
  } catch (error) {
    console.error('Error during cleanup:', error)
    throw error
  }
}

// Auto-cleanup on server start if too many reports exist
export async function autoCleanup() {
  try {
    const result = await pool.query('SELECT COUNT(*) as total FROM test_executions')
    const total = parseInt(result.rows[0]?.total || '0')
    
    // If more than 100 reports, keep only 50 most recent
    if (total > 100) {
      console.log(`⚠️  Found ${total} reports. Auto-cleanup triggered...`)
      await cleanupKeepRecent(50)
    }
    
    // Always cleanup orphaned files
    await cleanupOrphanedFiles()
  } catch (error) {
    console.warn('Auto-cleanup failed:', error)
  }
}

/**
 * Cleanup orphaned report files (files that exist but have no database record)
 */
export async function cleanupOrphanedFiles() {
  try {
    const reportsDir = path.resolve(__dirname, '../../../reports/output')
    
    // Check if directory exists
    try {
      await fs.access(reportsDir)
    } catch {
      return { deleted: 0, message: 'Reports directory not found' }
    }

    // Get all HTML files
    const files = await fs.readdir(reportsDir)
    const htmlFiles = files.filter(f => f.endsWith('.html'))

    if (htmlFiles.length === 0) {
      return { deleted: 0, message: 'No report files found' }
    }

    // Get all report paths from database
    const result = await pool.query(
      'SELECT report_path FROM test_executions WHERE report_path IS NOT NULL'
    )
    
    const dbPaths = new Set(result.rows.map(row => {
      // Extract just the filename from the path
      return path.basename(row.report_path)
    }))

    let deletedCount = 0
    
    // Delete orphaned files
    for (const file of htmlFiles) {
      if (!dbPaths.has(file)) {
        try {
          // Delete HTML file
          await fs.unlink(path.join(reportsDir, file))
          deletedCount++
          
          // Delete corresponding JSON file if exists
          const jsonFile = file.replace('.html', '.json')
          try {
            await fs.unlink(path.join(reportsDir, jsonFile))
          } catch {
            // JSON file might not exist
          }
        } catch (error) {
          console.error(`Failed to delete orphaned file: ${file}`, error)
        }
      }
    }

    if (deletedCount > 0) {
      console.log(`✓ Cleaned up ${deletedCount} orphaned report files`)
    }

    return { 
      deleted: deletedCount,
      message: `Cleaned up ${deletedCount} orphaned files`
    }
  } catch (error) {
    console.error('Error cleaning orphaned files:', error)
    throw error
  }
}
