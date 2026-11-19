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

function Login({ onLogin }) {
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
          <p>Multi-Store Demand & Inventory Intelligence Platform</p>
        </div>

        {!selectedRole ? (
          <>
            <div className="login-heading">
              <h2>Select Portal</h2>
              <p>Choose your workspace role to sign in to your dashboard.</p>
            </div>

            <div className="portal-options">
              <button
                type="button"
                className="login-button"
                onClick={() => handleSelectRole('admin')}
              >
                <ShieldCheck size={20} className="text-indigo-600" />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Administrator Portal</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Full platform analytics, store networks & user management
                  </div>
                </div>
                <ArrowRight size={18} />
              </button>

              <button
                type="button"
                className="login-button"
                onClick={() => handleSelectRole('store_manager')}
              >
                <Store size={20} className="text-emerald-600" />
                <div style={{ textAlign: 'left', flex: 1 }}>
                  <div style={{ fontWeight: 600 }}>Store Manager Portal</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    Store inventory monitoring, reorders & local transfers
                  </div>
                </div>
                <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <button
                type="button"
                className="back-button"
                style={{ margin: 0 }}
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

            <div className="login-heading">
              <h2>
                {selectedRole === 'admin'
                  ? 'Administrator Sign In'
                  : 'Store Manager Sign In'}
              </h2>
              <p>Enter your credentials to access your retail operations workspace.</p>
            </div>

            <form onSubmit={handleSubmit}>
              <label htmlFor="login-username">Username</label>
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

              <label htmlFor="login-password">Password</label>
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
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {error && <div className="login-error">{error}</div>}

              <button
                type="submit"
                className="login-button"
                disabled={loading}
              >
                {loading ? 'Authenticating...' : 'Sign in to Workspace'}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}

        <div className="login-footer">
          <span>Enterprise Grade JWT Authentication · AES-256 Protected</span>
        </div>
      </div>
    </div>
  )
}

export default Login
