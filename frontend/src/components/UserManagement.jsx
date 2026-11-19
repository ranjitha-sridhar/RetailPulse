import { useState } from 'react'
import { registerUser } from '../services/api'
import {
  UserPlus,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  Store,
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  Shield
} from 'lucide-react'

function UserManagement() {
  const [form, setForm] = useState({
    username: '',
    email: '',
    password: '',
    role: 'store_manager',
    store_id: ''
  })

  const [showPassword, setShowPassword] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    })
  }

  // Password strength helper
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { score: 0, label: '', color: '' }
    let score = 0
    if (pwd.length >= 8) score += 1
    if (pwd.length >= 12) score += 1
    if (/[A-Z]/.test(pwd)) score += 1
    if (/[0-9]/.test(pwd)) score += 1
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1

    if (score <= 2) return { score: 1, label: 'Weak', color: '#ef4444' }
    if (score <= 4) return { score: 2, label: 'Good', color: '#f59e0b' }
    return { score: 3, label: 'Strong', color: '#10b981' }
  }

  const pwdStrength = getPasswordStrength(form.password)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMessage('')
    setError('')
    setLoading(true)

    try {
      const payload = {
        ...form,
        store_id: form.role === 'store_manager' ? (form.store_id.trim() || 'CA_1') : null
      }

      const response = await registerUser(payload)

      setMessage(
        `${response.data.role === 'admin' ? 'Administrator' : 'Store Manager'} account "${response.data.username}" created successfully!`
      )

      setForm({
        username: '',
        email: '',
        password: '',
        role: 'store_manager',
        store_id: ''
      })
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Unable to create user account. Please check inputs.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="user-management" style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div className="panel user-management-card">
        <div className="panel-heading">
          <div>
            <h2>Create Workspace Account</h2>
            <p>Provision credentials for administrators and regional store managers.</p>
          </div>
          <div className="metric-icon indigo">
            <UserPlus size={20} />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="user-form">
          <div className="user-form form-row" style={{ marginTop: 0 }}>
            <div>
              <label htmlFor="reg-username">Username</label>
              <div className="login-input">
                <User size={16} />
                <input
                  id="reg-username"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="e.g. manager_tx"
                  minLength={3}
                  maxLength={50}
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="reg-email">Email Address</label>
              <div className="login-input">
                <Mail size={16} />
                <input
                  id="reg-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="e.g. manager@retailpulse.io"
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '16px' }}>
            <label htmlFor="reg-password">Password</label>
            <div className="login-input">
              <Lock size={16} />
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Minimum 8 characters (12+ recommended)"
                minLength={8}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>

            {form.password && (
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11.5px' }}>
                <span style={{ color: 'var(--color-text-muted)' }}>Strength:</span>
                <span style={{ color: pwdStrength.color, fontWeight: 600 }}>{pwdStrength.label}</span>
                <div style={{ display: 'flex', gap: '4px', flex: 1, maxWidth: '120px' }}>
                  <div style={{ height: 4, flex: 1, borderRadius: 2, background: pwdStrength.score >= 1 ? pwdStrength.color : '#e2e8f0' }} />
                  <div style={{ height: 4, flex: 1, borderRadius: 2, background: pwdStrength.score >= 2 ? pwdStrength.color : '#e2e8f0' }} />
                  <div style={{ height: 4, flex: 1, borderRadius: 2, background: pwdStrength.score >= 3 ? pwdStrength.color : '#e2e8f0' }} />
                </div>
              </div>
            )}
          </div>

          <div className="user-form form-row" style={{ marginTop: '16px' }}>
            <div>
              <label htmlFor="reg-role">Role Assignment</label>
              <select
                id="reg-role"
                name="role"
                value={form.role}
                onChange={handleChange}
              >
                <option value="store_manager">Store Manager</option>
                <option value="admin">Platform Administrator</option>
              </select>
            </div>

            {form.role === 'store_manager' && (
              <div>
                <label htmlFor="reg-store">Assigned Store Node</label>
                <select
                  id="reg-store"
                  name="store_id"
                  value={form.store_id}
                  onChange={handleChange}
                >
                  <option value="">Select Store...</option>
                  <option value="CA_1">CA_1 (California)</option>
                  <option value="TX_1">TX_1 (Texas)</option>
                  <option value="WI_1">WI_1 (Wisconsin)</option>
                </select>
              </div>
            )}
          </div>

          {message && (
            <div className="user-success">
              <CheckCircle size={17} /> {message}
            </div>
          )}

          {error && (
            <div className="user-error">
              <AlertCircle size={17} /> {error}
            </div>
          )}

          <button
            type="submit"
            className="login-button"
            disabled={loading}
            style={{ marginTop: '24px' }}
          >
            {loading ? 'Registering Account...' : 'Create Account'}
            {!loading && <UserPlus size={18} />}
          </button>
        </form>
      </div>

      {/* Role Capabilities Guide */}
      <div className="panel" style={{ marginTop: '20px' }}>
        <div className="panel-heading">
          <div>
            <h3>Role-Based Access Control Reference</h3>
            <p>Privileges and scope by assigned workspace role</p>
          </div>
          <Shield size={18} className="text-indigo-600" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          <div style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <ShieldCheck size={18} className="text-indigo-600" />
              <strong style={{ fontSize: '13px', color: 'var(--color-heading)' }}>Platform Administrator</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <li>Full visibility into all 3 store regions</li>
              <li>Execute global MIP transfer optimization</li>
              <li>Manage and provision user credentials</li>
              <li>Configure What-If simulation parameters</li>
            </ul>
          </div>

          <div style={{ padding: '16px', background: 'var(--color-bg)', borderRadius: 'var(--radius-md)', border: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Store size={18} className="text-emerald-600" />
              <strong style={{ fontSize: '13px', color: 'var(--color-heading)' }}>Store Manager</strong>
            </div>
            <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              <li>Store inventory monitoring and risk detection</li>
              <li>Inspect 7-day demand forecasts for local SKUs</li>
              <li>Review incoming and outgoing transfer routes</li>
              <li>Export replenishment and transfer manifests</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default UserManagement
