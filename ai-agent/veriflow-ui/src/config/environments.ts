export interface Environment {
  name: string
  label: string
  type?: 'ui' | 'api'
  baseUrl: string
  color: string
  icon: string
  isDefault?: boolean
  // UI-specific configuration
  username?: string
  password?: string
  // API-specific configuration
  apiKey?: string
  clientId?: string
  headers?: Record<string, string>
}

export const environments: Environment[] = [
  {
    name: 'dev',
    label: 'Development',
    baseUrl: 'https://dev.example.com',
    color: 'blue',
    icon: '🔧'
  },
  {
    name: 'staging',
    label: 'Staging',
    baseUrl: 'https://staging.example.com',
    color: 'yellow',
    icon: '🚀'
  },
  {
    name: 'production',
    label: 'Production',
    baseUrl: 'https://app.example.com',
    color: 'green',
    icon: '✅'
  }
]

export const getEnvironmentColor = (envName: string): string => {
  const colorMap: Record<string, string> = {
    sit: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    uat: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    dev: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    staging: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    production: 'text-neon-green bg-neon-green/10 border-neon-green/20',
    'api-sit': 'text-blue-400 bg-blue-400/10 border-blue-400/20',
    'api-uat': 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
    'api-prod': 'text-neon-green bg-neon-green/10 border-neon-green/20'
  }
  return colorMap[envName] || 'text-dark-400 bg-dark-400/10 border-dark-400/20'
}
