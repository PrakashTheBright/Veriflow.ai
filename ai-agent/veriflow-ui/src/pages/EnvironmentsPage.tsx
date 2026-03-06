import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Server, Plus, Trash2, Edit2, Save, X, Globe, 
  CheckCircle2, Loader2, ExternalLink, Code
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'

interface Environment {
  id: string
  name: string
  label: string
  type: 'ui' | 'api'
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

const colorOptions = [
  { name: 'blue', class: 'bg-blue-500', border: 'border-blue-500' },
  { name: 'green', class: 'bg-green-500', border: 'border-green-500' },
  { name: 'yellow', class: 'bg-yellow-500', border: 'border-yellow-500' },
  { name: 'purple', class: 'bg-purple-500', border: 'border-purple-500' },
  { name: 'pink', class: 'bg-pink-500', border: 'border-pink-500' },
  { name: 'orange', class: 'bg-orange-500', border: 'border-orange-500' },
]

const iconOptions = ['🔧', '🚀', '✅', '🌐', '⚡', '🔒', '🧪', '📦']

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

export default function EnvironmentsPage() {
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [filterType, setFilterType] = useState<'all' | 'ui' | 'api'>('all')
  const [newEnv, setNewEnv] = useState({
    name: '',
    label: '',
    type: 'ui' as 'ui' | 'api',
    baseUrl: '',
    color: 'blue',
    icon: '🔧'
  })

  useEffect(() => {
    loadEnvironments()
  }, [])

  const loadEnvironments = async () => {
    try {
      // Load from localStorage or use defaults
      const stored = localStorage.getItem('veriflow_environments')
      if (stored) {
        const parsed = JSON.parse(stored)
        // Migrate old data: add 'type' field if missing, fix API URLs
        const migrated = await Promise.all(parsed.map(async (env: any) => {
          const updated = {
            ...env,
            type: env.type || 'ui' // Default to 'ui' if type is missing
          }
          
          // Fix API environment URLs - remove /v3 suffix if present (endpoint already includes /v3)
          if (updated.type === 'api' && updated.baseUrl) {
            updated.baseUrl = updated.baseUrl.replace(/\/v3\/?$/, '')
          }
          
          // Fetch API credentials from server if missing
          if (updated.name === 'api-sit' && (!updated.apiKey || updated.apiKey === '')) {
            try {
              const creds = await api.getAPICredentials('SIT')
              updated.apiKey = creds.apiKey
              updated.clientId = creds.clientId
              updated.headers = { 'Content-Type': 'application/json', ...creds.headers }
            } catch { /* Use empty if not configured */ }
          }
          
          if (updated.name === 'api-uat' && (!updated.apiKey || updated.apiKey === '')) {
            try {
              const creds = await api.getAPICredentials('UAT')
              updated.apiKey = creds.apiKey
              updated.clientId = creds.clientId
              updated.headers = { 'Content-Type': 'application/json', ...creds.headers }
            } catch { /* Use empty if not configured */ }
          }
          
          if (updated.name === 'api-production' && (!updated.apiKey || updated.apiKey === '')) {
            try {
              const creds = await api.getAPICredentials('Production')
              updated.apiKey = creds.apiKey
              updated.clientId = creds.clientId
              updated.headers = { 'Content-Type': 'application/json', ...creds.headers }
            } catch { /* Use empty if not configured */ }
          }
          
          // Fetch UI credentials from server if missing
          if (updated.name === 'sit' && updated.type === 'ui' && !updated.username) {
            try {
              const creds = await api.getUICredentials('SIT')
              updated.username = creds.username
              updated.password = creds.password
            } catch { /* Use empty if not configured */ }
          }
          
          if (updated.name === 'uat' && updated.type === 'ui' && !updated.username) {
            try {
              const creds = await api.getUICredentials('UAT')
              updated.username = creds.username
              updated.password = creds.password
            } catch { /* Use empty if not configured */ }
          }
          
          if (updated.name === 'production' && updated.type === 'ui' && !updated.username) {
            try {
              const creds = await api.getUICredentials('Production')
              updated.username = creds.username
              updated.password = creds.password
            } catch { /* Use empty if not configured */ }
          }
          
          return updated
        }))
        setEnvironments(migrated)
        // Save migrated data back to localStorage
        localStorage.setItem('veriflow_environments', JSON.stringify(migrated))
      } else {
        // Fetch default credentials from server (including baseUrl)
        let sitApiCreds = { baseUrl: '', apiKey: '', clientId: '', headers: {} }
        let uatApiCreds = { baseUrl: '', apiKey: '', clientId: '', headers: {} }
        let prodApiCreds = { baseUrl: '', apiKey: '', clientId: '', headers: {} }
        let sitUiCreds = { appUrl: '', username: '', password: '' }
        let uatUiCreds = { appUrl: '', username: '', password: '' }
        let prodUiCreds = { appUrl: '', username: '', password: '' }
        
        try { 
          const c = await api.getAPICredentials('SIT')
          sitApiCreds = { baseUrl: c.baseUrl, apiKey: c.apiKey, clientId: c.clientId, headers: c.headers }
        } catch {}
        try { 
          const c = await api.getAPICredentials('UAT')
          uatApiCreds = { baseUrl: c.baseUrl, apiKey: c.apiKey, clientId: c.clientId, headers: c.headers }
        } catch {}
        try { 
          const c = await api.getAPICredentials('Production')
          prodApiCreds = { baseUrl: c.baseUrl, apiKey: c.apiKey, clientId: c.clientId, headers: c.headers }
        } catch {}
        try { 
          const c = await api.getUICredentials('SIT')
          sitUiCreds = { appUrl: c.appUrl, username: c.username, password: c.password }
        } catch {}
        try { 
          const c = await api.getUICredentials('UAT')
          uatUiCreds = { appUrl: c.appUrl, username: c.username, password: c.password }
        } catch {}
        try { 
          const c = await api.getUICredentials('Production')
          prodUiCreds = { appUrl: c.appUrl, username: c.username, password: c.password }
        } catch {}
        
        const defaults: Environment[] = [
          { 
            id: '1', 
            name: 'sit', 
            label: 'SIT', 
            type: 'ui', 
            baseUrl: sitUiCreds.appUrl || '', 
            color: 'blue', 
            icon: '🧪', 
            isDefault: true,
            username: sitUiCreds.username,
            password: sitUiCreds.password
          },
          { 
            id: '2', 
            name: 'uat', 
            label: 'UAT', 
            type: 'ui', 
            baseUrl: uatUiCreds.appUrl || '', 
            color: 'yellow', 
            icon: '🚀',
            username: uatUiCreds.username,
            password: uatUiCreds.password
          },
          { 
            id: '3', 
            name: 'production', 
            label: 'PRODUCTION', 
            type: 'ui', 
            baseUrl: prodUiCreds.appUrl || '', 
            color: 'green', 
            icon: '✅',
            username: prodUiCreds.username,
            password: prodUiCreds.password
          },
          { 
            id: '4', 
            name: 'api-sit', 
            label: 'API SIT', 
            type: 'api', 
            baseUrl: sitApiCreds.baseUrl || '', 
            color: 'blue', 
            icon: '⚡',
            apiKey: sitApiCreds.apiKey,
            clientId: sitApiCreds.clientId,
            headers: {
              'Content-Type': 'application/json',
              ...sitApiCreds.headers
            }
          },
          { 
            id: '5', 
            name: 'api-uat', 
            label: 'API UAT', 
            type: 'api', 
            baseUrl: uatApiCreds.baseUrl || '', 
            color: 'yellow', 
            icon: '🚀',
            apiKey: uatApiCreds.apiKey,
            clientId: uatApiCreds.clientId,
            headers: {
              'Content-Type': 'application/json',
              ...uatApiCreds.headers
            }
          },
          { 
            id: '6', 
            name: 'api-production', 
            label: 'API PRODUCTION', 
            type: 'api', 
            baseUrl: prodApiCreds.baseUrl || '', 
            color: 'green', 
            icon: '✅',
            apiKey: prodApiCreds.apiKey,
            clientId: prodApiCreds.clientId,
            headers: {
              'Content-Type': 'application/json',
              ...prodApiCreds.headers
            }
          },
        ]
        setEnvironments(defaults)
        localStorage.setItem('veriflow_environments', JSON.stringify(defaults))
      }
    } catch (error) {
      toast.error('Failed to load environments')
    } finally {
      setLoading(false)
    }
  }

  const saveEnvironments = (envs: Environment[]) => {
    localStorage.setItem('veriflow_environments', JSON.stringify(envs))
    setEnvironments(envs)
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('environmentsUpdated'))
  }

  const addEnvironment = () => {
    if (!newEnv.name || !newEnv.label || !newEnv.baseUrl) {
      toast.error('Please fill in all fields')
      return
    }

    const env: Environment = {
      id: Date.now().toString(),
      ...newEnv
    }

    const updated = [...environments, env]
    saveEnvironments(updated)
    setShowAddModal(false)
    setNewEnv({ name: '', label: '', type: 'ui', baseUrl: '', color: 'blue', icon: '🔧' })
    toast.success(`Environment "${env.label}" added`)
  }

  const deleteEnvironment = (id: string) => {
    const env = environments.find(e => e.id === id)
    if (env?.isDefault) {
      toast.error('Cannot delete default environment')
      return
    }
    
    const updated = environments.filter(e => e.id !== id)
    saveEnvironments(updated)
    toast.success('Environment deleted')
  }

  const updateEnvironment = (id: string, updates: Partial<Environment>) => {
    const updated = environments.map(e => 
      e.id === id ? { ...e, ...updates } : e
    )
    saveEnvironments(updated)
    setEditingId(null)
    toast.success('Environment updated')
  }

  const setDefault = (id: string) => {
    const updated = environments.map(e => ({
      ...e,
      isDefault: e.id === id
    }))
    saveEnvironments(updated)
    toast.success('Default environment updated')
  }

  const getColorClass = (color: string) => {
    return colorOptions.find(c => c.name === color)?.class || 'bg-blue-500'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-neon-purple animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Loading environments...</p>
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
      <motion.div variants={itemVariants}>
        <div className="glass-card p-6 rounded-2xl border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-purple/20">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">Environments</h1>
                <p className="text-dark-400 text-sm">
                  Manage test environments for UI and API testing
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="btn-primary flex items-center gap-2 hover:scale-105 transition-transform"
            >
              <Plus className="w-4 h-4" />
              Add Environment
            </button>
          </div>
        </div>
      </motion.div>

      {/* Filter Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-3">
          <button
            onClick={() => setFilterType('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all ${
              filterType === 'all'
                ? 'bg-gradient-to-r from-cyan-500 to-purple-500 text-white shadow-lg shadow-purple-500/50'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            All Environments
          </button>
          <button
            onClick={() => setFilterType('ui')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              filterType === 'ui'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            <Globe className="w-4 h-4" />
            UI Environments
          </button>
          <button
            onClick={() => setFilterType('api')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
              filterType === 'api'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/50'
            }`}
          >
            <Code className="w-4 h-4" />
            API Environments
          </button>
        </div>
      </motion.div>

      {/* Environment Cards */}
      <motion.div variants={itemVariants} className="grid gap-4">
        {environments
          .filter(env => filterType === 'all' || env.type === filterType)
          .map((env) => (
          <motion.div
            key={env.id}
            layout
            className="glass-card rounded-xl p-5 border border-white/5 hover:border-white/10 transition-all"
          >
            {editingId === env.id ? (
              <EditEnvironmentForm
                env={env}
                onSave={(updates) => updateEnvironment(env.id, updates)}
                onCancel={() => setEditingId(null)}
                colorOptions={colorOptions}
                iconOptions={iconOptions}
              />
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl ${getColorClass(env.color)} flex items-center justify-center text-2xl`}>
                    {env.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-white">{env.label}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full flex items-center gap-1 ${
                        env.type === 'ui' 
                          ? 'bg-cyan-500/20 text-cyan-400' 
                          : 'bg-purple-500/20 text-purple-400'
                      }`}>
                        {env.type === 'ui' ? <Globe className="w-3 h-3" /> : <Code className="w-3 h-3" />}
                        {env.type.toUpperCase()}
                      </span>
                      {env.isDefault && (
                        <span className="px-2 py-0.5 bg-neon-green/20 text-neon-green text-xs rounded-full">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-dark-400 text-sm bg-dark-800 px-2 py-0.5 rounded">
                        {env.name}
                      </code>
                      <a 
                        href={env.baseUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-neon-blue text-sm flex items-center gap-1 hover:underline"
                      >
                        {env.baseUrl}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {!env.isDefault && (
                    <button
                      onClick={() => setDefault(env.id)}
                      className="p-2 text-dark-400 hover:text-neon-green hover:bg-neon-green/10 rounded-lg transition-all"
                      title="Set as default"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                    </button>
                  )}
                  <button
                    onClick={() => setEditingId(env.id)}
                    className="p-2 text-dark-400 hover:text-neon-blue hover:bg-neon-blue/10 rounded-lg transition-all"
                    title="Edit"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  {!env.isDefault && (
                    <button
                      onClick={() => deleteEnvironment(env.id)}
                      className="p-2 text-dark-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                      title="Delete"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Add Environment Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card p-6 rounded-2xl border border-white/10 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">Add Environment</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-dark-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-dark-300 text-sm mb-2">Environment Type</label>
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setNewEnv({ ...newEnv, type: 'ui' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                        newEnv.type === 'ui'
                          ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                          : 'bg-dark-800 text-dark-400 border border-dark-600 hover:bg-dark-700'
                      }`}
                    >
                      <Globe className="w-5 h-5" />
                      UI
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewEnv({ ...newEnv, type: 'api' })}
                      className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg transition-all ${
                        newEnv.type === 'api'
                          ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                          : 'bg-dark-800 text-dark-400 border border-dark-600 hover:bg-dark-700'
                      }`}
                    >
                      <Code className="w-5 h-5" />
                      API
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Name (identifier)</label>
                  <input
                    type="text"
                    value={newEnv.name}
                    onChange={(e) => setNewEnv({ ...newEnv, name: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                    placeholder="e.g., qa, uat, sandbox"
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Label (display name)</label>
                  <input
                    type="text"
                    value={newEnv.label}
                    onChange={(e) => setNewEnv({ ...newEnv, label: e.target.value })}
                    placeholder="e.g., QA Environment"
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Base URL</label>
                  <input
                    type="url"
                    value={newEnv.baseUrl}
                    onChange={(e) => setNewEnv({ ...newEnv, baseUrl: e.target.value })}
                    placeholder="https://qa.example.com"
                    className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-xl text-white placeholder-dark-400 focus:border-neon-blue focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Color</label>
                  <div className="flex gap-2">
                    {colorOptions.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setNewEnv({ ...newEnv, color: color.name })}
                        className={`w-8 h-8 rounded-lg ${color.class} ${
                          newEnv.color === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-800' : ''
                        } transition-all`}
                      />
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-dark-300 text-sm mb-2">Icon</label>
                  <div className="flex gap-2 flex-wrap">
                    {iconOptions.map((icon) => (
                      <button
                        key={icon}
                        onClick={() => setNewEnv({ ...newEnv, icon })}
                        className={`w-10 h-10 rounded-lg bg-dark-800 text-xl flex items-center justify-center ${
                          newEnv.icon === icon ? 'ring-2 ring-neon-blue' : ''
                        } hover:bg-dark-700 transition-all`}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addEnvironment}
                    className="flex-1 btn-primary flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Environment
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

// Edit form component
function EditEnvironmentForm({ 
  env, 
  onSave, 
  onCancel,
  colorOptions,
  iconOptions 
}: { 
  env: Environment
  onSave: (updates: Partial<Environment>) => void
  onCancel: () => void
  colorOptions: { name: string; class: string }[]
  iconOptions: string[]
}) {
  const [form, setForm] = useState({
    label: env.label,
    type: env.type,
    baseUrl: env.baseUrl,
    color: env.color,
    icon: env.icon
  })

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-dark-300 text-sm mb-2">Environment Type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setForm({ ...form, type: 'ui' })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
              form.type === 'ui'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/50'
                : 'bg-dark-800 text-dark-400 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            <Globe className="w-4 h-4" />
            UI
          </button>
          <button
            type="button"
            onClick={() => setForm({ ...form, type: 'api' })}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-all ${
              form.type === 'api'
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/50'
                : 'bg-dark-800 text-dark-400 border border-dark-600 hover:bg-dark-700'
            }`}
          >
            <Code className="w-4 h-4" />
            API
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-dark-300 text-sm mb-2">Label</label>
          <input
            type="text"
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-dark-300 text-sm mb-2">Base URL</label>
          <input
            type="url"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            className="w-full px-4 py-2 bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-neon-blue focus:outline-none"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div>
          <label className="block text-dark-300 text-sm mb-2">Color</label>
          <div className="flex gap-2">
            {colorOptions.map((color) => (
              <button
                key={color.name}
                onClick={() => setForm({ ...form, color: color.name })}
                className={`w-6 h-6 rounded ${color.class} ${
                  form.color === color.name ? 'ring-2 ring-white' : ''
                } transition-all`}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-dark-300 text-sm mb-2">Icon</label>
          <div className="flex gap-1">
            {iconOptions.map((icon) => (
              <button
                key={icon}
                onClick={() => setForm({ ...form, icon })}
                className={`w-8 h-8 rounded bg-dark-800 text-lg flex items-center justify-center ${
                  form.icon === icon ? 'ring-2 ring-neon-blue' : ''
                } hover:bg-dark-700 transition-all`}
              >
                {icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-dark-400 hover:text-white transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(form)}
          className="btn-primary px-4 py-2 flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          Save
        </button>
      </div>
    </div>
  )
}
