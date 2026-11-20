import { useState } from 'react'
import { loginUser } from '../services/api'
import {
  LockKeyhole,
  User,
  ArrowRight,
  ShieldCheck,
  Store,
  ArrowLeft,
  Eye,
  EyeOff,
  Boxes
} from 'lucide-react'

export default function Login({ onLogin }) {
  const [selectedRole, setSelectedRole] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSelectRole = (role) => {
    setSelectedRole(role)
    setUsername('')
    setPassword('')
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await loginUser({ username, password })
      const loggedInUser = response.data.user

      const expectedRole =
        selectedRole === 'admin' ? 'admin' : 'store_manager'

      if (loggedInUser.role !== expectedRole) {
        setError(`This account has the role "${loggedInUser.role}". Please switch to the ${loggedInUser.role === 'admin' ? 'Administrator' : 'Store Manager'} portal.`)
        return
      }

      sessionStorage.setItem(
        'retailpulse_token',
        response.data.access_token
      )

      onLogin(loggedInUser)
    } catch (err) {
      setError(
        err.response?.data?.detail || 'Invalid username or password. Please try again.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className={`login-card ${error ? 'shake' : ''}`}>
        <div className="login-brand">
          <div className="login-logo">
            <Boxes size={28} />
          </div>
          <h1>RetailPulse</h1>
          <p>Multi-Store Demand & Inventory Optimization Platform</p>
        </div>

        {!selectedRole ? (
          <>
            <div className="login-heading" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-heading)' }}>Select Workspace Portal</h2>
              <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Choose your authorization portal to access your store operations.
              </p>
            </div>

            <div style={{ display: 'grid', gap: '12px' }}>
              <button
                type="button"
                className="action-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-heading)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => handleSelectRole('admin')}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--color-primary-light)', display: 'grid', placeItems: 'center', color: 'var(--color-primary)' }}>
                  <ShieldCheck size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Administrator Portal</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    Full platform analytics, 4-store optimization & user management
                  </div>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>

              <button
                type="button"
                className="action-btn"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '14px 18px',
                  borderRadius: 'var(--radius-lg)',
                  border: '1.5px solid var(--color-border)',
                  background: 'var(--color-surface)',
                  color: 'var(--color-heading)',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => handleSelectRole('store_manager')}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: 'var(--radius-md)', background: 'var(--color-healthy-bg)', display: 'grid', placeItems: 'center', color: 'var(--color-healthy)' }}>
                  <Store size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '14px' }}>Store Manager Portal</div>
                  <div style={{ fontSize: '11.5px', color: 'var(--color-text-muted)' }}>
                    Store-specific inventory monitoring, reorders & local transfers
                  </div>
                </div>
                <ArrowRight size={18} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                type="button"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--color-text-muted)',
                  fontSize: '12.5px',
                  cursor: 'pointer'
                }}
                onClick={() => {
                  setSelectedRole(null)
                  setError('')
                }}
              >
                <ArrowLeft size={16} /> Switch Portal
              </button>

              <span className={`risk-badge ${selectedRole === 'admin' ? 'high' : 'low'}`} style={{ fontSize: '11px', textTransform: 'capitalize' }}>
                {selectedRole === 'admin' ? 'Administrator' : 'Store Manager'}
              </span>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-heading)', margin: 0 }}>
                {selectedRole === 'admin' ? 'Administrator Sign In' : 'Store Manager Sign In'}
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Enter your credentials to access your retail operations workspace.
              </p>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="login-username" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
                Username
              </label>
              <div className="login-input">
                <User size={18} />
                <input
                  id="login-username"
                  type="text"
                  placeholder="Enter your username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                />
              </div>

              <label htmlFor="login-password" style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: '14px 0 6px' }}>
                Password
              </label>
              <div className="login-input">
                <LockKeyhole size={18} />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button
                type="submit"
                className="primary-button"
                disabled={loading}
                style={{ width: '100%', marginTop: '20px', padding: '12px' }}
              >
                {loading ? 'Authenticating...' : 'Sign in to Workspace'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}

        <div style={{ textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '24px' }}>
          <span>Enterprise Grade JWT Authentication · AES-256 Protected</span>
        </div>
      </div>
    </div>
  )
}
