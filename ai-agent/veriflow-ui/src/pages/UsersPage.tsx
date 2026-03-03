import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Users as UsersIcon, Plus, Edit2, Trash2, X, Save, 
  Mail, Lock, User as UserIcon, Shield, Search, Eye, EyeOff, Layers 
} from 'lucide-react'
import toast from 'react-hot-toast'
import { api } from '../services/api'

interface UserModule {
  id: number
  name: string
  path: string
}

interface User {
  id: string
  username: string
  email: string
  role: string
  created_at: string
  updated_at: string
  modules?: UserModule[]
}

interface Module {
  id: number
  name: string
  path: string
  icon: string
  description: string
  display_order: number
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [modules, setModules] = useState<Module[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'user',
    selectedModuleIds: [] as number[]
  })

  useEffect(() => {
    fetchUsers()
    fetchModules()
  }, [])

  const fetchModules = async () => {
    try {
      const response = await api.getModules()
      setModules(response.modules)
    } catch (error: any) {
      console.error('Failed to fetch modules:', error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await api.getUsers()
      setUsers(response.users)
    } catch (error: any) {
      toast.error(error.message || 'Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      toast.error('All fields are required')
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.selectedModuleIds.length === 0) {
      toast.error('Please select at least one module')
      return
    }

    try {
      await api.createUser(formData.username, formData.email, formData.password, formData.role, formData.selectedModuleIds)
      toast.success('User created successfully')
      setShowAddModal(false)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to create user')
    }
  }

  const handleUpdateUser = async () => {
    if (!editingUser) return

    if (formData.password && formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    if (formData.selectedModuleIds.length === 0) {
      toast.error('Please select at least one module')
      return
    }

    const updateData: any = {
      username: formData.username,
      email: formData.email,
      role: formData.role,
      moduleIds: formData.selectedModuleIds,
    }

    if (formData.password) {
      updateData.password = formData.password
    }

    try {
      await api.updateUser(editingUser.id, updateData)
      toast.success('User updated successfully')
      setEditingUser(null)
      resetForm()
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!confirm(`Are you sure you want to delete user "${username}"?`)) {
      return
    }

    try {
      await api.deleteUser(userId)
      toast.success('User deleted successfully')
      fetchUsers()
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete user')
    }
  }

  const resetForm = () => {
    setFormData({
      username: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'user',
      selectedModuleIds: []
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const openEditModal = (user: User) => {
    setEditingUser(user)
    setFormData({
      username: user.username,
      email: user.email,
      password: '',
      confirmPassword: '',
      role: user.role,
      selectedModuleIds: user.modules?.map(m => m.id) || []
    })
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const toggleModuleSelection = (moduleId: number) => {
    setFormData(prev => ({
      ...prev,
      selectedModuleIds: prev.selectedModuleIds.includes(moduleId)
        ? prev.selectedModuleIds.filter(id => id !== moduleId)
        : [...prev.selectedModuleIds, moduleId]
    }))
  }

  const selectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      selectedModuleIds: modules.map(m => m.id)
    }))
  }

  const deselectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      selectedModuleIds: []
    }))
  }

  const closeModal = () => {
    setShowAddModal(false)
    setEditingUser(null)
    resetForm()
  }

  const filteredUsers = users.filter(user =>
    user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-dark-950">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center shadow-lg shadow-neon-purple/20">
              <UsersIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white mb-1">User Management</h1>
              <p className="text-dark-400 text-sm">
                Manage user accounts and permissions
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-neon-blue to-neon-cyan text-white rounded-xl hover:shadow-lg hover:shadow-neon-blue/20 transition-all font-medium"
          >
            <Plus className="w-5 h-5" />
            Add User
          </button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-dark-900/50 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-neon-blue/50"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-dark-900/50 backdrop-blur-sm border border-white/10 rounded-2xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-neon-blue border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-dark-400">
              <UsersIcon className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-lg">No users found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/5">
                    <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">Username</th>
                    <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">Email</th>
                    <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">Role</th>
                    <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">Modules</th>
                    <th className="text-left px-6 py-4 text-dark-400 font-medium text-sm">Created</th>
                    <th className="text-right px-6 py-4 text-dark-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-neon-blue to-neon-cyan flex items-center justify-center">
                            <span className="text-white font-bold text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-white font-medium">{user.username}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-dark-300">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium ${
                          user.role === 'admin'
                            ? 'bg-neon-purple/20 text-neon-purple border border-neon-purple/30'
                            : 'bg-dark-700 text-dark-300 border border-white/10'
                        }`}>
                          {user.role === 'admin' && <Shield className="w-3 h-3" />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {user.modules && user.modules.length > 0 ? (
                            user.modules.slice(0, 3).map((module) => (
                              <span
                                key={module.id}
                                className="px-2 py-0.5 bg-neon-blue/10 text-neon-blue border border-neon-blue/20 rounded text-xs"
                                title={module.name}
                              >
                                {module.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-dark-500 text-sm">No modules</span>
                          )}
                          {user.modules && user.modules.length > 3 && (
                            <span className="px-2 py-0.5 bg-dark-700 text-dark-300 border border-white/10 rounded text-xs">
                              +{user.modules.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-dark-300 text-sm">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="p-2 hover:bg-neon-blue/20 text-neon-blue rounded-lg transition-colors"
                            title="Edit user"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.username)}
                            className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit User Modal */}
      <AnimatePresence>
        {(showAddModal || editingUser) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={closeModal}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-dark-900 border border-white/10 rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">
                  {editingUser ? 'Edit User' : 'Add New User'}
                </h2>
                <button
                  onClick={closeModal}
                  className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-dark-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-neon-blue/50"
                      placeholder="Enter username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-neon-blue/50"
                      placeholder="Enter email"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Password {editingUser && <span className="text-dark-500">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-neon-blue/50"
                      placeholder={editingUser ? "Enter new password" : "Enter password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Confirm Password {editingUser && <span className="text-dark-500">(leave blank to keep current)</span>}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="w-full pl-10 pr-12 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-dark-400 focus:outline-none focus:border-neon-blue/50"
                      placeholder={editingUser ? "Confirm new password" : "Confirm password"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-dark-300 mb-2">
                    Role
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-400" />
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-neon-blue/50 appearance-none cursor-pointer"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-dark-300 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Module Access
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={selectAllModules}
                        className="text-xs text-neon-blue hover:text-neon-cyan transition-colors"
                      >
                        Select All
                      </button>
                      <span className="text-dark-500">|</span>
                      <button
                        type="button"
                        onClick={deselectAllModules}
                        className="text-xs text-dark-400 hover:text-white transition-colors"
                      >
                        Clear
                      </button>
                    </div>
                  </div>
                  <div className="bg-dark-800 border border-white/10 rounded-xl p-3 max-h-48 overflow-y-auto">
                    <div className="grid grid-cols-1 gap-2">
                      {modules.map((module) => (
                        <label
                          key={module.id}
                          className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            formData.selectedModuleIds.includes(module.id)
                              ? 'bg-neon-blue/10 border border-neon-blue/30'
                              : 'hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={formData.selectedModuleIds.includes(module.id)}
                            onChange={() => toggleModuleSelection(module.id)}
                            className="w-4 h-4 rounded border-dark-500 bg-dark-700 text-neon-blue focus:ring-neon-blue/50"
                          />
                          <span className={`text-sm ${
                            formData.selectedModuleIds.includes(module.id) ? 'text-white' : 'text-dark-300'
                          }`}>
                            {module.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-dark-500 mt-2">
                    {formData.selectedModuleIds.length} of {modules.length} modules selected
                  </p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={editingUser ? handleUpdateUser : handleAddUser}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-neon-blue to-neon-cyan text-white rounded-xl hover:shadow-lg hover:shadow-neon-blue/20 transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
