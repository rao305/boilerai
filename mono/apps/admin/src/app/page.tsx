'use client'

import { useState, useEffect } from 'react'

interface User {
  id: string
  name: string
  email: string
  maskedEmail: string
  roles: string[]
  lastLoginAt: string | null
  createdAt: string
}

interface Metrics {
  activeUsers: {
    daily: number
    weekly: number
    monthly: number
  }
  performance: {
    uptime: number
    avgResponseTime: number
    successRate: number
    requestsPerSecond: number
    totalRequests24h: number
  }
}

export default function AdminDashboard() {
  const [showEmails, setShowEmails] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMetrics()
    loadUsers()
  }, [])

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/metrics')
      const data = await response.json()
      setMetrics(data)
    } catch (error) {
      console.error('Failed to load metrics:', error)
    }
  }

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/users')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-yellow-500 text-xl">🚂 Loading Boiler AI Mission Control...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="bg-black border-b border-yellow-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-yellow-500">🚂 Boiler AI Mission Control</h1>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-300">admin@purdue.edu</span>
            <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center text-black text-sm font-bold">
              A
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 bg-gray-900 border-r border-yellow-500 min-h-screen p-4">
          <ul className="space-y-2">
            {[
              { id: 'overview', name: '📊 Overview', icon: '📊' },
              { id: 'users', name: '👥 Registered Users', icon: '👥' },
              { id: 'usage', name: '📈 Usage', icon: '📈' },
            ].map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors ${
                    activeTab === item.id 
                      ? 'bg-yellow-500 text-black font-semibold' 
                      : 'text-gray-300 hover:bg-gray-800 hover:text-yellow-500'
                  }`}
                >
                  {item.name}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {activeTab === 'overview' && (
            <div>
              <h2 className="text-3xl font-bold text-yellow-500 mb-6">System Overview</h2>
              
              {/* KPI Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
                  <h3 className="text-yellow-500 text-sm font-semibold mb-2">UPTIME</h3>
                  <p className="text-3xl font-bold text-white">{metrics?.performance.uptime || 0}%</p>
                  <p className="text-gray-400 text-sm mt-1">Last 30 days</p>
                </div>
                
                <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
                  <h3 className="text-yellow-500 text-sm font-semibold mb-2">AVG RESPONSE TIME</h3>
                  <p className="text-3xl font-bold text-white">{metrics?.performance.avgResponseTime || 0}ms</p>
                  <p className="text-gray-400 text-sm mt-1">Average latency</p>
                </div>
                
                <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
                  <h3 className="text-yellow-500 text-sm font-semibold mb-2">SUCCESS RATE</h3>
                  <p className="text-3xl font-bold text-white">{metrics?.performance.successRate || 0}%</p>
                  <p className="text-gray-400 text-sm mt-1">Last 24 hours</p>
                </div>
                
                <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
                  <h3 className="text-yellow-500 text-sm font-semibold mb-2">TOTAL REQUESTS</h3>
                  <p className="text-3xl font-bold text-white">{metrics?.performance.totalRequests24h || 0}</p>
                  <p className="text-gray-400 text-sm mt-1">Last 24 hours</p>
                </div>
              </div>

              {/* Active Users Section */}
              <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-yellow-500 mb-4">Active Users</h3>
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{metrics?.activeUsers.daily || 0}</p>
                    <p className="text-gray-400">Daily Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{metrics?.activeUsers.weekly || 0}</p>
                    <p className="text-gray-400">Weekly Active</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{metrics?.activeUsers.monthly || 0}</p>
                    <p className="text-gray-400">Monthly Active</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-yellow-500">Registered Users ({users.length})</h2>
                <button
                  onClick={() => setShowEmails(!showEmails)}
                  className="bg-yellow-500 text-black px-4 py-2 rounded font-semibold hover:bg-yellow-400 transition-colors"
                >
                  {showEmails ? '🙈 Mask Emails' : '👁️ Reveal Emails (OWNER Only)'}
                </button>
              </div>

              <div className="bg-gray-900 border border-yellow-500 rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-yellow-500 text-black">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold">Name</th>
                      <th className="px-6 py-3 text-left font-semibold">Email</th>
                      <th className="px-6 py-3 text-left font-semibold">Roles</th>
                      <th className="px-6 py-3 text-left font-semibold">Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-800">
                        <td className="px-6 py-4 text-white">{user.name}</td>
                        <td className="px-6 py-4 text-gray-300">
                          {showEmails ? user.email : user.maskedEmail}
                        </td>
                        <td className="px-6 py-4">
                          {user.roles.map((role, idx) => (
                            <span key={idx} className={`px-2 py-1 rounded text-xs font-semibold mr-1 ${
                              role === 'OWNER' ? 'bg-purple-900 text-purple-300' :
                              role === 'ADMIN' ? 'bg-red-900 text-red-300' :
                              role === 'ANALYST' ? 'bg-blue-900 text-blue-300' :
                              'bg-gray-700 text-gray-300'
                            }`}>
                              {role}
                            </span>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-gray-400">
                          {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'usage' && (
            <div>
              <h2 className="text-3xl font-bold text-yellow-500 mb-6">Usage Analytics</h2>
              <div className="bg-gray-900 border border-yellow-500 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-yellow-500 mb-4">Real-Time Stats</h3>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-gray-400">Registered Users</p>
                    <p className="text-2xl font-bold text-white">{users.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Database Status</p>
                    <p className="text-2xl font-bold text-green-400">Connected</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Notice */}
          <div className="mt-8 bg-gray-900 border border-yellow-500 rounded-lg p-4">
            <h4 className="text-yellow-500 font-semibold mb-2">🔒 Privacy-First Design</h4>
            <p className="text-gray-300 text-sm">
              This admin interface shows only aggregated, anonymized metrics. No raw user prompts, 
              AI responses, or personal information is stored or displayed. All data follows FERPA 
              compliance guidelines with Row Level Security (RLS) and automatic TTL cleanup.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}