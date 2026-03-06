import { Router } from 'express'

const router = Router()

// Environment-specific API credentials - all values from .env, no hardcoded fallbacks
const getAPICredentials = (environment: string) => {
  const env = environment.toUpperCase()
  
  switch (env) {
    case 'SIT':
      return {
        baseUrl: process.env.SIT_API_BASE_URL || '',
        apiKey: process.env.SIT_API_KEY || '',
        clientId: process.env.SIT_API_CLIENT_ID || '',
        headers: {
          'x-api-key': process.env.SIT_API_KEY || ''
        }
      }
    case 'UAT':
      return {
        baseUrl: process.env.UAT_API_BASE_URL || '',
        apiKey: process.env.UAT_API_KEY || '',
        clientId: process.env.UAT_API_CLIENT_ID || '',
        headers: {
          'x-api-key': process.env.UAT_API_KEY || ''
        }
      }
    case 'PRODUCTION':
    case 'PROD':
      return {
        baseUrl: process.env.PROD_API_BASE_URL || '',
        apiKey: process.env.PROD_API_KEY || '',
        clientId: process.env.PROD_API_CLIENT_ID || '',
        headers: {
          'x-api-key': process.env.PROD_API_KEY || ''
        }
      }
    default:
      // Default to UAT
      return {
        baseUrl: process.env.API_BASE_URL || '',
        apiKey: process.env.API_KEY || '',
        clientId: process.env.API_CLIENT_ID || '',
        headers: {
          'x-api-key': process.env.API_KEY || ''
        }
      }
  }
}

// Environment-specific UI credentials - all values from .env, no hardcoded fallbacks
const getUICredentials = (environment: string) => {
  const env = environment.toUpperCase()
  
  switch (env) {
    case 'SIT':
      return {
        appUrl: process.env.SIT_APP_URL || '',
        username: process.env.SIT_APP_USERNAME || '',
        password: process.env.SIT_APP_PASSWORD || ''
      }
    case 'UAT':
      return {
        appUrl: process.env.UAT_APP_URL || '',
        username: process.env.UAT_APP_USERNAME || '',
        password: process.env.UAT_APP_PASSWORD || ''
      }
    case 'PRODUCTION':
    case 'PROD':
      return {
        appUrl: process.env.PROD_APP_URL || '',
        username: process.env.PROD_APP_USERNAME || '',
        password: process.env.PROD_APP_PASSWORD || ''
      }
    default:
      // Default to UAT
      return {
        appUrl: process.env.APP_URL || '',
        username: process.env.APP_USERNAME || '',
        password: process.env.APP_PASSWORD || ''
      }
  }
}

// GET /api/credentials/:environment/api - Get API credentials for environment
router.get('/:environment/api', (req, res) => {
  try {
    const { environment } = req.params
    const credentials = getAPICredentials(environment)
    
    // Check if credentials are configured
    if (!credentials.apiKey || !credentials.clientId) {
      return res.status(404).json({
        error: 'Credentials not configured',
        message: `API credentials for ${environment} environment are not configured in .env file`
      })
    }
    
    res.json(credentials)
  } catch (error) {
    console.error('Error fetching API credentials:', error)
    res.status(500).json({ error: 'Failed to fetch credentials' })
  }
})

// GET /api/credentials/:environment/ui - Get UI credentials for environment
router.get('/:environment/ui', (req, res) => {
  try {
    const { environment } = req.params
    const credentials = getUICredentials(environment)
    
    // Check if credentials are configured
    if (!credentials.username || !credentials.password) {
      return res.status(404).json({
        error: 'Credentials not configured',
        message: `UI credentials for ${environment} environment are not configured in .env file`
      })
    }
    
    res.json(credentials)
  } catch (error) {
    console.error('Error fetching UI credentials:', error)
    res.status(500).json({ error: 'Failed to fetch credentials' })
  }
})

// GET /api/credentials/environments - Get all available environments
router.get('/environments', (req, res) => {
  const environments = [
    {
      name: 'SIT',
      apiConfigured: !!(process.env.SIT_API_KEY && process.env.SIT_API_CLIENT_ID),
      uiConfigured: !!(process.env.SIT_APP_USERNAME && process.env.SIT_APP_PASSWORD)
    },
    {
      name: 'UAT',
      apiConfigured: !!(process.env.UAT_API_KEY && process.env.UAT_API_CLIENT_ID),
      uiConfigured: !!(process.env.UAT_APP_USERNAME && process.env.UAT_APP_PASSWORD)
    },
    {
      name: 'Production',
      apiConfigured: !!(process.env.PROD_API_KEY && process.env.PROD_API_CLIENT_ID),
      uiConfigured: !!(process.env.PROD_APP_USERNAME && process.env.PROD_APP_PASSWORD)
    }
  ]
  
  res.json(environments)
})

export default router
