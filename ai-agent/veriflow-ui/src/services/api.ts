const API_URL = import.meta.env.VITE_API_URL || ''

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'
  body?: any
  headers?: Record<string, string>
}

class ApiClient {
  private baseUrl: string
  private token: string | null = null

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
    // Load token from storage
    const stored = localStorage.getItem('veriflow-auth')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        this.token = parsed?.state?.token || null
      } catch {
        this.token = null
      }
    }
  }

  setToken(token: string | null) {
    this.token = token
  }

  private async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, headers = {} } = options

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    }

    if (this.token) {
      requestHeaders['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }))
      throw new Error(error.message || 'Request failed')
    }

    return response.json()
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    })
    this.setToken(result.token)
    return result
  }

  async signup(username: string, email: string, password: string) {
    const result = await this.request<{ token: string; user: any }>('/api/auth/signup', {
      method: 'POST',
      body: { username, email, password },
    })
    this.setToken(result.token)
    return result
  }

  async logout() {
    await this.request('/api/auth/logout', { method: 'POST' })
    this.setToken(null)
  }

  async verifyToken() {
    return this.request<{ valid: boolean; user: any }>('/api/auth/verify')
  }

  // Test endpoints
  async getUITests() {
    return this.request<{ testCases: any[] }>('/api/tests/ui')
  }

  async getAPITests() {
    return this.request<{ testCases: any[] }>('/api/tests/api')
  }

  async executeTest(testId: string, type: string, fileName: string, environmentUrl?: string, environmentConfig?: { apiKey?: string; clientId?: string; headers?: Record<string, string> }) {
    return this.request<{ success: boolean; executionId: string; message: string }>(
      '/api/tests/execute',
      {
        method: 'POST',
        body: { testId, type, fileName, environmentUrl, environmentConfig },
      }
    )
  }

  async getExecutionStatus(executionId: string) {
    return this.request<any>(`/api/tests/execution/${executionId}`)
  }

  // Report endpoints
  async getReports(filters?: {
    type?: string
    status?: string
    search?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  }) {
    const params = new URLSearchParams()
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) params.append(key, String(value))
      })
    }
    const queryString = params.toString()
    return this.request<{ reports: any[]; pagination?: any }>(`/api/reports${queryString ? `?${queryString}` : ''}`)
  }

  async getReportStats() {
    return this.request<{
      total: number
      passed: number
      failed: number
      uiTests: number
      apiTests: number
      avgDuration: number
      avgPassRate: number
    }>('/api/reports/stats')
  }

  async viewReport(reportId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/view`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    })
    return response.text()
  }

  async downloadReport(reportId: string) {
    const response = await fetch(`${this.baseUrl}/api/reports/${reportId}/download`, {
      headers: this.token ? { Authorization: `Bearer ${this.token}` } : {},
    })
    const blob = await response.blob()
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${reportId}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(url)
  }

  async deleteReport(reportId: string) {
    return this.request<{ success: boolean; message: string }>(`/api/reports/${reportId}`, {
      method: 'DELETE',
    })
  }

  // User management endpoints (admin only)
  async getUsers() {
    return this.request<{ users: any[] }>('/api/users')
  }

  async getUser(userId: string) {
    return this.request<{ user: any }>(`/api/users/${userId}`)
  }

  async getModules() {
    return this.request<{ modules: any[] }>('/api/users/modules')
  }

  async createUser(username: string, email: string, password: string, role: string = 'user', moduleIds: number[] = []) {
    return this.request<{ user: any; message: string }>('/api/users', {
      method: 'POST',
      body: { username, email, password, role, moduleIds },
    })
  }

  async updateUser(userId: string, data: { username?: string; email?: string; password?: string; role?: string; moduleIds?: number[] }) {
    return this.request<{ user: any; message: string }>(`/api/users/${userId}`, {
      method: 'PUT',
      body: data,
    })
  }

  async deleteUser(userId: string) {
    return this.request<{ message: string }>(`/api/users/${userId}`, {
      method: 'DELETE',
    })
  }

  // Health check
  async healthCheck() {
    return this.request<{ status: string; timestamp: string }>('/api/health')
  }
}

export const api = new ApiClient(API_URL)
export default api
